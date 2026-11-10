
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartEnergy.Domain.Entities;
using SmartEnergy.Infrastructure;

namespace SmartEnergy.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TarifasController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TarifasController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("atual")]
        public async Task<IActionResult> ObterTarifaAtual()
        {
            var tarifa = await _context.TarifasEnergia
                .AsNoTracking()
                .Where(t => t.Estado == "SP" && t.Data_Fim == null)
                .OrderByDescending(t => t.Data_Inicio)
                .FirstOrDefaultAsync();

            if (tarifa == null)
            {
                return NotFound(
                    "Nenhuma tarifa ativa foi encontrada para SP.");
            }

            return Ok(new
            {
                tarifa.Id,
                tarifa.Estado,
                valorKwh = tarifa.Valor_Kwh,
                dataInicio = tarifa.Data_Inicio,
                dataFim = tarifa.Data_Fim
            });
        }

        [HttpPut("atual")]
        public async Task<IActionResult> AtualizarTarifaAtual(
            [FromBody] AtualizarTarifaRequest request)
        {
            if (request.ValorKwh <= 0)
            {
                return BadRequest(
                    "O valor da tarifa deve ser maior que zero.");
            }

            if (request.ValorKwh != decimal.Round(request.ValorKwh, 4))
            {
                return BadRequest(
                    "O valor da tarifa deve ter no máximo quatro casas decimais.");
            }

            var tarifa = await _context.TarifasEnergia
                .Where(t => t.Estado == "SP" && t.Data_Fim == null)
                .OrderByDescending(t => t.Data_Inicio)
                .FirstOrDefaultAsync();

            if (tarifa == null)
            {
                return NotFound(
                    "Nenhuma tarifa ativa foi encontrada para SP.");
            }

            tarifa.Valor_Kwh = request.ValorKwh;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensagem = "Tarifa atualizada com sucesso.",
                tarifa.Id,
                tarifa.Estado,
                valorKwh = tarifa.Valor_Kwh,
                dataInicio = tarifa.Data_Inicio,
                dataFim = tarifa.Data_Fim
            });
        }
    }

    public class AtualizarTarifaRequest
    {
        public decimal ValorKwh { get; set; }
    }
}
