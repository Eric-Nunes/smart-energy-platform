using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartEnergy.Infrastructure;

namespace SmartEnergy.API.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class EnergyController : ControllerBase
    {
        private readonly AppDbContext _context;

        public EnergyController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("consumption")]
        public async Task<IActionResult> GetConsumption(
        [FromQuery] string period = "day")
        {
            var medicoes = await _context.Medicoes
                .OrderBy(m => m.Data_Hora)
                .ToListAsync();

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
    }
}