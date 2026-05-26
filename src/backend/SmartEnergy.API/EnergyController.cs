using Microsoft.AspNetCore.Mvc;
using SmartEnergy.API.Services;

namespace SmartEnergy.API.Controllers;

[ApiController]
[Route("energy")]
public class EnergyController : ControllerBase
{
    private readonly TariffLookupService _tariffLookupService;

    public EnergyController(TariffLookupService tariffLookupService)
    {
        _tariffLookupService = tariffLookupService;
    }

    [HttpGet("consumption")]
    public IActionResult GetConsumption([FromQuery] string period = "day")
    {
        return Ok(period.ToLowerInvariant() switch
        {
            "week" => new[]
            {
                new { label = "Seg", consumption = 13.6 },
                new { label = "Ter", consumption = 12.8 },
                new { label = "Qua", consumption = 15.1 },
                new { label = "Qui", consumption = 14.4 },
                new { label = "Sex", consumption = 16.9 },
                new { label = "Sáb", consumption = 18.7 },
                new { label = "Dom", consumption = 17.2 },
            },
            "month" => new[]
            {
                new { label = "Sem 1", consumption = 82.0 },
                new { label = "Sem 2", consumption = 91.0 },
                new { label = "Sem 3", consumption = 86.0 },
                new { label = "Sem 4", consumption = 96.0 },
            },
            "year" => new[]
            {
                new { label = "Jan", consumption = 312.0 },
                new { label = "Fev", consumption = 286.0 },
                new { label = "Mar", consumption = 301.0 },
                new { label = "Abr", consumption = 274.0 },
                new { label = "Mai", consumption = 263.0 },
                new { label = "Jun", consumption = 248.0 },
                new { label = "Jul", consumption = 256.0 },
                new { label = "Ago", consumption = 279.0 },
                new { label = "Set", consumption = 292.0 },
                new { label = "Out", consumption = 318.0 },
                new { label = "Nov", consumption = 336.0 },
                new { label = "Dez", consumption = 354.0 },
            },
            _ => Enumerable.Range(0, 24)
                .Select(hour => new
                {
                    label = $"{hour:00}h",
                    consumption = new[]
                    {
                        0.5, 0.42, 0.38, 0.35, 0.34, 0.48, 0.82, 1.15, 1.28, 1.42, 1.62, 1.95,
                        2.24, 2.12, 1.88, 1.76, 2.08, 2.86, 3.42, 3.18, 2.74, 2.15, 1.42, 0.86,
                    }[hour]
                })
        });
    }

    [HttpGet("devices")]
    public IActionResult GetDevices([FromQuery] string period = "day")
    {
        var values = period.ToLowerInvariant() switch
        {
            "week" => new[] { 32.6, 38.4, 46.7, 12.3, 9.8, 4.1 },
            "month" => new[] { 126.0, 148.0, 184.0, 46.0, 37.0, 16.0 },
            "year" => new[] { 1512.0, 1776.0, 2208.0, 552.0, 444.0, 192.0 },
            _ => new[] { 4.8, 6.2, 7.4, 2.1, 1.5, 0.6 },
        };

        var devices = new[]
        {
            new { id = "device-1", device = "Geladeira", smartPlugName = "Plug cozinha 01", residenceId = "unit-main", room = "Cozinha" },
            new { id = "device-2", device = "Chuveiro", smartPlugName = "Plug banheiro 01", residenceId = "unit-main", room = "Banheiro social" },
            new { id = "device-3", device = "Ar-condicionado", smartPlugName = "Plug suíte 01", residenceId = "unit-main", room = "Suíte" },
            new { id = "device-4", device = "Computador", smartPlugName = "Plug escritório 01", residenceId = "unit-main", room = "Escritório" },
            new { id = "device-5", device = "Televisão", smartPlugName = "Plug sala 01", residenceId = "unit-main", room = "Sala" },
            new { id = "device-6", device = "Carregadores", smartPlugName = "Plug quarto 02", residenceId = "unit-main", room = "Quarto 2" },
        };

        return Ok(devices.Select((device, index) => new
        {
            device.id,
            device.device,
            device.smartPlugName,
            device.residenceId,
            device.room,
            consumption = values[index],
            history = BuildHistory(values[index], period),
        }));
    }

    [HttpGet("tariff")]
    public async Task<IActionResult> GetTariff([FromQuery] string state = "SP", CancellationToken cancellationToken = default)
    {
        var tariff = await _tariffLookupService.GetTariffAsync(state, cancellationToken);
        return Ok(tariff);
    }

    private static IEnumerable<object> BuildHistory(double value, string period)
    {
        return period.ToLowerInvariant() switch
        {
            "week" => new object[]
            {
                new { label = "Seg", consumption = Math.Round(value * 0.13, 1) },
                new { label = "Ter", consumption = Math.Round(value * 0.12, 1) },
                new { label = "Qua", consumption = Math.Round(value * 0.14, 1) },
                new { label = "Qui", consumption = Math.Round(value * 0.15, 1) },
                new { label = "Sex", consumption = Math.Round(value * 0.16, 1) },
                new { label = "Sáb", consumption = Math.Round(value * 0.17, 1) },
                new { label = "Dom", consumption = Math.Round(value * 0.13, 1) },
            },
            "month" => new object[]
            {
                new { label = "Semana 1", consumption = Math.Round(value * 0.24, 1) },
                new { label = "Semana 2", consumption = Math.Round(value * 0.26, 1) },
                new { label = "Semana 3", consumption = Math.Round(value * 0.23, 1) },
                new { label = "Semana 4", consumption = Math.Round(value * 0.27, 1) },
            },
            "year" => new object[]
            {
                new { label = "1º tri", consumption = Math.Round(value * 0.24, 1) },
                new { label = "2º tri", consumption = Math.Round(value * 0.22, 1) },
                new { label = "3º tri", consumption = Math.Round(value * 0.25, 1) },
                new { label = "4º tri", consumption = Math.Round(value * 0.29, 1) },
            },
            _ => new object[]
            {
                new { label = "00h-06h", consumption = Math.Round(value * 0.18, 1) },
                new { label = "06h-12h", consumption = Math.Round(value * 0.24, 1) },
                new { label = "12h-18h", consumption = Math.Round(value * 0.27, 1) },
                new { label = "18h-23h", consumption = Math.Round(value * 0.31, 1) },
            },
        };
    }
}
