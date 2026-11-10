using MQTTnet;
using MQTTnet.Protocol;
using System.Buffers;
using System.Text;
using System.Text.Json;
using SmartEnergy.API.DTOs;
using SmartEnergy.Infrastructure;
using SmartEnergy.Domain.Entities;

namespace SmartEnergy.API.Services
{
    public class MqttSubscriberService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly MonitoramentoAtual _monitoramento;
        private readonly IConfiguration _configuration;

        public MqttSubscriberService(
            IServiceScopeFactory scopeFactory,
            MonitoramentoAtual monitoramento,
            IConfiguration configuration)
        {
            _scopeFactory = scopeFactory;
            _monitoramento = monitoramento;
            _configuration = configuration;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var username = _configuration["Mqtt:Username"];
            var password = _configuration["Mqtt:Password"];
            var brokerUri = _configuration["Mqtt:WebSocketUri"]
                ?? "wss://0fff694999c9490e9fbd847167c93371.s1.eu.hivemq.cloud:8884/mqtt";

            if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
            {
                throw new InvalidOperationException(
                    "Credenciais MQTT ausentes. Configure Mqtt:Username e Mqtt:Password nas configurações locais.");
            }

            var factory = new MqttClientFactory();
            using var mqttClient = factory.CreateMqttClient();

            mqttClient.ConnectedAsync += e =>
            {
                Console.WriteLine($"[{DateTimeOffset.Now:O}] MQTT conectado ao broker.");
                return Task.CompletedTask;
            };

            mqttClient.DisconnectedAsync += e =>
            {
                var detalhe = e.Exception?.ToString() ?? "O broker encerrou a conexão sem informar uma exceção.";
                Console.WriteLine($"[{DateTimeOffset.Now:O}] MQTT desconectado. Detalhes: {detalhe}");
                return Task.CompletedTask;
            };

            mqttClient.ApplicationMessageReceivedAsync += async e =>
            {
                try
                {
                    ReadOnlySequence<byte> payloadSequence = e.ApplicationMessage.Payload;
                    var payload = Encoding.UTF8.GetString(payloadSequence.ToArray());

                    var dto = JsonSerializer.Deserialize<MedicaoEnergiaDto>(payload);
                    if (dto == null)
                    {
                        Console.WriteLine($"[{DateTimeOffset.Now:O}] Payload MQTT inválido: {payload}");
                        return;
                    }

                    // Segunda camada de proteção: não gravar valores fisicamente inválidos.
                    if (dto.Tensao <= 0 ||
                        dto.Corrente < 0 ||
                        dto.PotenciaAtiva < 0 ||
                        dto.EnergiaAcumulada < 0 ||
                        dto.Frequencia <= 0 ||
                        dto.FatorPotencia < 0 ||
                        dto.FatorPotencia > 1)
                    {
                        Console.WriteLine(
                            $"[{DateTimeOffset.Now:O}] Medição MQTT rejeitada por conter valores inválidos. " +
                            $"Tensão={dto.Tensao}, Corrente={dto.Corrente}, Potência={dto.PotenciaAtiva}, " +
                            $"Energia={dto.EnergiaAcumulada}, Frequência={dto.Frequencia}, " +
                            $"FatorPotência={dto.FatorPotencia}, Tópico={e.ApplicationMessage.Topic}");
                        return;
                    }

                    var aparelhoId = _monitoramento.AparelhoIdAtual;
                    if (aparelhoId == null)
                    {
                        Console.WriteLine($"[{DateTimeOffset.Now:O}] Mensagem recebida, mas nenhum aparelho está selecionado. Tópico: {e.ApplicationMessage.Topic}");
                        return;
                    }

                    var medicao = new Medicao
                    {
                        Aparelho_Id = aparelhoId.Value,
                        Tensao = dto.Tensao,
                        Corrente = dto.Corrente,
                        Potencia = dto.PotenciaAtiva,
                        Energia_Kwh = dto.EnergiaAcumulada,
                        Frequencia = dto.Frequencia,
                        Fator_Potencia = dto.FatorPotencia,
                        Data_Hora = DateTime.Now
                    };

                    using var scope = _scopeFactory.CreateScope();
                    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                    context.Medicoes.Add(medicao);
                    await context.SaveChangesAsync(stoppingToken);

                    Console.WriteLine(
                        $"[{DateTimeOffset.Now:O}] Medição gravada. AparelhoId={aparelhoId.Value}, " +
                        $"Potência={dto.PotenciaAtiva}, Tópico={e.ApplicationMessage.Topic}");
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    // Encerramento normal do serviço.
                }
                catch (Exception ex)
                {
                    Console.WriteLine(
                        $"[{DateTimeOffset.Now:O}] Falha ao processar/gravar mensagem MQTT. " +
                        $"Tópico={e.ApplicationMessage.Topic}. Exceção: {ex}");
                }
            };

            var options = new MqttClientOptionsBuilder()
                .WithWebSocketServer(o => o.WithUri(brokerUri))
                .WithCredentials(username, password)
                .WithTlsOptions(o => o.UseTls())
                .Build();

            var retryDelay = TimeSpan.FromSeconds(5);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    if (!mqttClient.IsConnected)
                    {
                        Console.WriteLine($"[{DateTimeOffset.Now:O}] Tentando conectar ao MQTT...");
                        await mqttClient.ConnectAsync(options, stoppingToken);

                        await mqttClient.SubscribeAsync(
                            new MqttTopicFilterBuilder()
                                .WithTopic("tcc/energia/#")
                                .WithQualityOfServiceLevel(MqttQualityOfServiceLevel.AtLeastOnce)
                                .Build(),
                            stoppingToken);

                        Console.WriteLine($"[{DateTimeOffset.Now:O}] Inscrição MQTT ativa em tcc/energia/#.");
                    }

                    // Verifica periodicamente o estado da conexão. Se cair, o loop tenta reconectar.
                    await Task.Delay(TimeSpan.FromSeconds(1), stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[{DateTimeOffset.Now:O}] Erro no ciclo MQTT: {ex}");
                    try
                    {
                        await Task.Delay(retryDelay, stoppingToken);
                    }
                    catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                    {
                        break;
                    }
                }
            }

            if (mqttClient.IsConnected)
            {
                try
                {
                    await mqttClient.DisconnectAsync(cancellationToken: CancellationToken.None);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[{DateTimeOffset.Now:O}] Erro ao encerrar conexão MQTT: {ex}");
                }
            }
        }
    }
}
