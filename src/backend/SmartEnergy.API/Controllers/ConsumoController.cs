using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartEnergy.API.Services;
using SmartEnergy.Infrastructure;

namespace SmartEnergy.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ConsumoController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ConsumoEnergiaService _consumoService;

        public ConsumoController(
            AppDbContext context,
            ConsumoEnergiaService consumoService)
        {
            _context = context;
            _consumoService = consumoService;
        }

        [HttpGet("aparelho/{aparelhoId}")]
        public async Task<IActionResult> CalcularConsumo(int aparelhoId)
        {
            var aparelho = await _context.Aparelhos
                .FirstOrDefaultAsync(a => a.Id == aparelhoId);

            if (aparelho == null)
            {
                return NotFound("Aparelho não encontrado.");
            }

            var medicoes = await _context.Medicoes
                .Where(m => m.Aparelho_Id == aparelhoId)
                .OrderBy(m => m.Data_Hora)
                .ToListAsync();

            if (medicoes.Count < 2)
            {
                return Ok(new
                {
                    aparelhoId,
                    nomeAparelho = aparelho.Nome_Aparelho,
                    quantidadeMedicoes = medicoes.Count,
                    consumoKwh = 0
                });
            }

            var consumoKwh = _consumoService
                .CalcularConsumoKwh(medicoes);

            return Ok(new
            {
                aparelhoId,
                nomeAparelho = aparelho.Nome_Aparelho,
                quantidadeMedicoes = medicoes.Count,
                consumoKwh = Math.Round(consumoKwh, 6)
            });
        }

        [HttpGet]
        public async Task<IActionResult> ObterConsumoPorAparelho()
        {
            var aparelhos = await _context.Aparelhos
                .AsNoTracking()
                .ToListAsync();

            var medicoes = await _context.Medicoes
                .AsNoTracking()
                .ToListAsync();

            var tarifa = await _context.TarifasEnergia
                .AsNoTracking()
                .Where(t => t.Estado == "SP" && t.Data_Fim == null)
                .OrderByDescending(t => t.Data_Inicio)
                .FirstOrDefaultAsync();

            if (tarifa == null)
            {
                return StatusCode(
                    500,
                    "Nenhuma tarifa de energia válida foi cadastrada para SP.");
            }

            var resultado = aparelhos.Select(aparelho =>
            {
                var medicoesAparelho = medicoes
                    .Where(m => m.Aparelho_Id == aparelho.Id)
                    .ToList();

                var consumoKwh = _consumoService
                    .CalcularConsumoKwh(medicoesAparelho);

                return new
                {
                    aparelhoId = aparelho.Id,
                    nomeAparelho = aparelho.Nome_Aparelho,
                    quantidadeMedicoes = medicoesAparelho.Count,
                    consumoKwh = Math.Round(consumoKwh, 6),
                    custoEstimado = Math.Round(consumoKwh * tarifa.Valor_Kwh, 4)
                };
            }).ToList();

            return Ok(resultado);
        }

        [HttpGet("aparelho/{aparelhoId}/validar-intervalos")]
        public async Task<IActionResult> ValidarIntervalos(int aparelhoId)
        {
            var aparelho = await _context.Aparelhos
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == aparelhoId);

            if (aparelho == null)
            {
                return NotFound("Aparelho não encontrado.");
            }

            var medicoes = await _context.Medicoes
                .AsNoTracking()
                .Where(m => m.Aparelho_Id == aparelhoId)
                .OrderBy(m => m.Data_Hora)
                .ToListAsync();

            var consumoTotal = _consumoService
                .CalcularConsumoKwh(medicoes);

            var intervalos = _consumoService
                .CalcularIntervalos(medicoes);

            var somaIntervalos = intervalos
                .Sum(i => i.ConsumoKwh);

            return Ok(new
            {
                aparelhoId = aparelho.Id,
                nomeAparelho = aparelho.Nome_Aparelho,
                quantidadeMedicoes = medicoes.Count,
                quantidadeIntervalosValidos = intervalos.Count,
                consumoTotalKwh = Math.Round(consumoTotal, 8),
                somaIntervalosKwh = Math.Round(somaIntervalos, 8),
                diferencaKwh = Math.Round(Math.Abs(consumoTotal - somaIntervalos), 8)
            });
        }

        [HttpGet("aparelho/{aparelhoId}/historico")]
        public async Task<IActionResult> ObterHistoricoConsumo(int aparelhoId)
        {
            var aparelho = await _context.Aparelhos
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == aparelhoId);

            if (aparelho == null)
            {
                return NotFound("Aparelho não encontrado.");
            }

            var medicoes = await _context.Medicoes
                .AsNoTracking()
                .Where(m => m.Aparelho_Id == aparelhoId)
                .OrderBy(m => m.Data_Hora)
                .ToListAsync();

            var intervalos = _consumoService
                .CalcularIntervalos(medicoes);

            return Ok(new
            {
                aparelhoId = aparelho.Id,
                nomeAparelho = aparelho.Nome_Aparelho,
                quantidadeMedicoes = medicoes.Count,
                quantidadeIntervalosValidos = intervalos.Count,
                consumoTotalKwh = Math.Round(
                    intervalos.Sum(i => i.ConsumoKwh), 8),
                historico = intervalos.Select(i => new
                {
                    dataHora = i.DataHora,
                    potenciaMedia = Math.Round(i.PotenciaMedia, 3),
                    consumoKwh = Math.Round(i.ConsumoKwh, 8)
                }).ToList()
            });
        }


        [HttpGet("metas/progresso")]
        public async Task<IActionResult> ObterProgressoMensal()
        {
            var hoje = DateTime.Today;

            var inicioMes = new DateTime(
                hoje.Year,
                hoje.Month,
                1);

            var inicioProximoMes = inicioMes.AddMonths(1);

            // Busca as medições do mês e uma pequena margem anterior
            // para permitir calcular intervalos válidos na virada do mês.
            var medicoes = await _context.Medicoes
                .AsNoTracking()
                .Where(m =>
                    m.Data_Hora >= inicioMes.AddSeconds(-10) &&
                    m.Data_Hora < inicioProximoMes)
                .OrderBy(m => m.Aparelho_Id)
                .ThenBy(m => m.Data_Hora)
                .ToListAsync();

            decimal consumoMensalKwh = 0m;
            var quantidadeIntervalosValidos = 0;

            // Calcula separadamente para cada aparelho, sem misturar
            // medições de dispositivos diferentes.
            foreach (var grupo in medicoes.GroupBy(m => m.Aparelho_Id))
            {
                var intervalos = _consumoService
                    .CalcularIntervalos(grupo);

                var intervalosDoMes = intervalos
                    .Where(i =>
                        i.DataHora >= inicioMes &&
                        i.DataHora < inicioProximoMes)
                    .ToList();

                consumoMensalKwh += intervalosDoMes
                    .Sum(i => i.ConsumoKwh);

                quantidadeIntervalosValidos += intervalosDoMes.Count;
            }

            var tarifa = await _context.TarifasEnergia
                .AsNoTracking()
                .Where(t => t.Estado == "SP" && t.Data_Fim == null)
                .OrderByDescending(t => t.Data_Inicio)
                .FirstOrDefaultAsync();

            if (tarifa == null)
            {
                return StatusCode(
                    500,
                    "Nenhuma tarifa de energia válida foi cadastrada para SP.");
            }

            var mesReferencia = inicioMes;

            var meta = await _context.MetasMensais
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    m => m.Mes_Referencia == mesReferencia);

            var custoMensalReais = consumoMensalKwh * tarifa.Valor_Kwh;

            decimal? percentualConsumo = null;
            decimal? percentualCusto = null;

            if (meta != null)
            {
                percentualConsumo = Math.Round(
                    consumoMensalKwh / meta.Meta_Consumo_Kwh * 100m,
                    2);

                percentualCusto = Math.Round(
                    custoMensalReais / meta.Meta_Custo_Reais * 100m,
                    2);
            }

            return Ok(new
            {
                mesReferencia,
                consumoMensalKwh = Math.Round(consumoMensalKwh, 6),
                custoMensalReais = Math.Round(custoMensalReais, 2),
                quantidadeIntervalosValidos,
                tarifaKwh = tarifa.Valor_Kwh,
                metaConfigurada = meta != null,
                metaConsumoKwh = meta?.Meta_Consumo_Kwh,
                metaCustoReais = meta?.Meta_Custo_Reais,
                percentualConsumo,
                percentualCusto
            });
        }




    }


}