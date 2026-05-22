using SimuladorIoT.Config;
using SimuladorIoT.Models;
using SimuladorIoT.Services;
using System.Text.Json;

var mqttSettings = new MqttConfig
{
    Broker = "0fff694999c9490e9fbd847167c93371.s1.eu.hivemq.cloud",
    Porta = 8883,
    Usuario = "tcc_mqtt",
    Senha = "senha"
};

var mqttService = new MqttPublisher();

await mqttService.ConectarAsync(mqttSettings);

var random = new Random();

while (true)
{
    for (int dispositivo = 1; dispositivo <= 3; dispositivo++)
    {
        var medicao = new MedicaoEnergia
        {
            Dispositivo_Id = dispositivo,
            Tensao = Math.Round(random.NextDouble() * (127 - 110) + 110, 2),
            Corrente = Math.Round(random.NextDouble() * 10, 2),
            Potencia = Math.Round(random.NextDouble() * 1500, 2),
            Consumo_Kwh = Math.Round(random.NextDouble() * 5, 2),
            Data_Hora = DateTime.Now
        };

        var payload = JsonSerializer.Serialize(medicao);

        var topico = $"tcc/energia/dispositivo{dispositivo}";

        await mqttService.PublicarAsync(topico, payload);

        Console.WriteLine(payload);
    }

    await Task.Delay(10000);
}