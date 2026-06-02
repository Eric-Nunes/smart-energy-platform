using Microsoft.AspNetCore.Mvc;
using SmartEnergy.API.Services;
using SmartEnergy.Infrastructure;
using Microsoft.EntityFrameworkCore;
using SmartEnergy.Domain.Entities;

namespace SmartEnergy.API.Controllers;

[ApiController]
[Route("[controller]")]
public class EnergyController : ControllerBase
{
    private readonly TariffLookupService _tariffLookupService;
    private readonly AppDbContext _context;

    public EnergyController(
        TariffLookupService tariffLookupService,
        AppDbContext context)
    {
        _tariffLookupService = tariffLookupService;
        _context = context;
    }

    [HttpGet("consumption")]
    public async Task<IActionResult> GetConsumption(
        [FromQuery] string period = "day")
    {
        List<Medicao> medicoes = await _context.Medicoes.OrderBy(m => m.Data_Hora).ToListAsync();

        var resultado = medicoes
            .GroupBy(m => m.Data_Hora.Hour)
            .Select(g => new
            {
                label = $"{g.Key:00}h",
                consumption = Math.Round(
                    g.Average(x => x.Consumo_Kwh),
                    2
                )
            })
            .OrderBy(x => x.label)
            .ToList();

        return Ok(resultado);
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
