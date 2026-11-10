
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartEnergy.Domain.Entities;
using SmartEnergy.Infrastructure;

namespace SmartEnergy.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MetasMensaisController : ControllerBase
    {
        private readonly AppDbContext _context;

        public MetasMensaisController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("atual")]
        public async Task<IActionResult> ObterMetaAtual()
        {
            var mesReferencia = new DateTime(
                DateTime.Today.Year,
                DateTime.Today.Month,
                1);

            var meta = await _context.MetasMensais
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    m => m.Mes_Referencia == mesReferencia);

            if (meta == null)
            {
                return Ok(new
                {
                    mesReferencia,
                    configurada = false,
                    metaConsumoKwh = (decimal?)null,
                    metaCustoReais = (decimal?)null
                });
            }

            return Ok(new
            {
                mesReferencia = meta.Mes_Referencia,
                configurada = true,
                metaConsumoKwh = meta.Meta_Consumo_Kwh,
                metaCustoReais = meta.Meta_Custo_Reais,
                dataAtualizacao = meta.Data_Atualizacao
            });
        }

        [HttpPut("atual")]
        public async Task<IActionResult> SalvarMetaAtual(
            [FromBody] AtualizarMetaMensalRequest request)
        {
            if (request.MetaConsumoKwh <= 0)
            {
                return BadRequest(
                    "A meta de consumo deve ser maior que zero.");
            }

            if (request.MetaConsumoKwh !=
                decimal.Round(request.MetaConsumoKwh, 4))
            {
                return BadRequest(
                    "A meta de consumo deve ter no máximo quatro casas decimais.");
            }

            if (request.MetaCustoReais <= 0)
            {
                return BadRequest(
                    "A meta de custo deve ser maior que zero.");
            }

            if (request.MetaCustoReais !=
                decimal.Round(request.MetaCustoReais, 2))
            {
                return BadRequest(
                    "A meta de custo deve ter no máximo duas casas decimais.");
            }

            var mesReferencia = new DateTime(
                DateTime.Today.Year,
                DateTime.Today.Month,
                1);

            var meta = await _context.MetasMensais
                .FirstOrDefaultAsync(
                    m => m.Mes_Referencia == mesReferencia);

            if (meta == null)
            {
                meta = new MetaMensal
                {
                    Mes_Referencia = mesReferencia,
                    Meta_Consumo_Kwh = request.MetaConsumoKwh,
                    Meta_Custo_Reais = request.MetaCustoReais,
                    Data_Atualizacao = DateTime.Now
                };

                _context.MetasMensais.Add(meta);
            }
            else
            {
                meta.Meta_Consumo_Kwh = request.MetaConsumoKwh;
                meta.Meta_Custo_Reais = request.MetaCustoReais;
                meta.Data_Atualizacao = DateTime.Now;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensagem = "Meta mensal salva com sucesso.",
                mesReferencia = meta.Mes_Referencia,
                configurada = true,
                metaConsumoKwh = meta.Meta_Consumo_Kwh,
                metaCustoReais = meta.Meta_Custo_Reais,
                dataAtualizacao = meta.Data_Atualizacao
            });
        }
    }

    public class AtualizarMetaMensalRequest
    {
        public decimal MetaConsumoKwh { get; set; }

        public decimal MetaCustoReais { get; set; }
    }
}
