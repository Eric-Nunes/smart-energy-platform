using MQTTnet;
using MQTTnet.Protocol;
using System.Buffers;
using System.Text.Json;
using SmartEnergy.API.DTOs;
using SmartEnergy.Infrastructure;
using SmartEnergy.Domain.Entities;

namespace SmartEnergy.API.Services
{
    public class MqttSubscriberService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;

        public MqttSubscriberService(IServiceScopeFactory scopeFactory)
        {
            _scopeFactory = scopeFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var factory = new MqttClientFactory();

            var mqttClient = factory.CreateMqttClient();

            var options = new MqttClientOptionsBuilder()
                .WithWebSocketServer(o =>
                {
                    // Em vez de options.Uri = "...", usamos o método WithUri
                    o.WithUri("wss://0fff694999c9490e9fbd847167c93371.s1.eu.hivemq.cloud:8884/mqtt");
                })
                .WithCredentials("tcc_mqtt", "Tcc_mqtt@378")
                .WithTlsOptions(o =>
                {
                    // Necessário para HiveMQ Cloud (porta 8884 geralmente é WSS + TLS)
                    o.UseTls();
                })
                .Build();

            mqttClient.ConnectedAsync += e =>
            {
                Console.WriteLine("MQTT conectado!");

                return Task.CompletedTask;
            };

            mqttClient.DisconnectedAsync += e =>
            {
                Console.WriteLine("MQTT desconectado!");

                return Task.CompletedTask;
            };

            mqttClient.ApplicationMessageReceivedAsync += async e =>
            {
                try
                {
                    ReadOnlySequence<byte> payloadSequence = e.ApplicationMessage.Payload;

                    byte[] payloadBytes = payloadSequence.ToArray();

                    var payload = System.Text.Encoding.UTF8.GetString(payloadBytes);

                    Console.WriteLine("=================================");
                    Console.WriteLine($"Topico: {e.ApplicationMessage.Topic}");
                    Console.WriteLine($"Payload: {payload}");
                    Console.WriteLine("=================================");

                    var dto = JsonSerializer.Deserialize<MedicaoEnergiaDto>(payload);

                    if (dto == null)
                    {
                        Console.WriteLine("Payload inválido!");
                        return;
                    }

                    var medicao = new Medicao
                    {
                        Dispositivo_Id = dto.Dispositivo_Id,
                        Tensao = dto.Tensao,
                        Corrente = dto.Corrente,
                        Potencia = dto.Potencia,
                        Consumo_Kwh = dto.Consumo_Kwh,
                        Data_Hora = dto.Data_Hora
                    };

                    using var scope = _scopeFactory.CreateScope();

                    var context = scope.ServiceProvider
                        .GetRequiredService<AppDbContext>();

                    context.Medicoes.Add(medicao);

                    await context.SaveChangesAsync();

                    return;

                }
                
                catch (Exception ex)
                {
                    Console.WriteLine(ex.Message);
                }
            };



            await mqttClient.ConnectAsync(
                options,
                stoppingToken
            );

            await mqttClient.SubscribeAsync(
                new MqttTopicFilterBuilder()
                    .WithTopic("tcc/energia/#")
                    .WithQualityOfServiceLevel(
                        MqttQualityOfServiceLevel.AtLeastOnce
                    )
                    .Build(),
                stoppingToken
            );

            Console.WriteLine(
                "Inscrito no tópico tcc/energia/#"
            );

            await Task.Delay(
                Timeout.Infinite,
                stoppingToken
            );
        }
    }
}