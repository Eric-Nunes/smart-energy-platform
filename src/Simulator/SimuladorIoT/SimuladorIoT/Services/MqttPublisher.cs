using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MQTTnet;
using MQTTnet.Client;
using MQTTnet.Protocol;
using SimuladorIoT.Config;


namespace SimuladorIoT.Services
{
    public class MqttPublisher
    {
        private readonly IMqttClient _mqttClient;

        public MqttPublisher()
        {
            var factory = new MqttFactory();
            _mqttClient = factory.CreateMqttClient();
        }

        public async Task ConectarAsync(MqttConfig settings)
        {
            var options = new MqttClientOptionsBuilder()
                .WithTcpServer(settings.Broker, settings.Porta)
                .WithCredentials(settings.Usuario, settings.Senha)
                .WithTlsOptions(new MqttClientTlsOptions
                {
                    UseTls = true,
                    IgnoreCertificateChainErrors = true,
                    IgnoreCertificateRevocationErrors = true,
                    AllowUntrustedCertificates = true
                })
                .Build();

            await _mqttClient.ConnectAsync(options);

            Console.WriteLine("Conectado ao broker MQTT!");
        }

        public async Task PublicarAsync(string topico, string payload)
        {
            var message = new MqttApplicationMessageBuilder()
                .WithTopic(topico)
                .WithPayload(Encoding.UTF8.GetBytes(payload))
                .WithQualityOfServiceLevel(MqttQualityOfServiceLevel.AtLeastOnce)
                .Build();

            await _mqttClient.PublishAsync(message);

            Console.WriteLine($"Mensagem enviada para {topico}");
        }
    }
}
