using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartEnergy.Infrastructure;

namespace SmartEnergy.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MedicoesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public MedicoesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> Obter()
        {
            var medicoes = await _context.Medicoes
                .AsNoTracking()
                .OrderByDescending(m => m.Data_Hora)
                .ToListAsync();

            return Ok(medicoes);
        }

        // Retorna a última medição registrada de cada aparelho cadastrado.
        // Aparelhos sem medições também são retornados, com os campos de leitura nulos.
        [HttpGet("ultimas-por-aparelho")]
        public async Task<IActionResult> ObterUltimasPorAparelho()
        {
            var aparelhos = await _context.Aparelhos
                .AsNoTracking()
                .Select(aparelho => new
                {
                    aparelhoId = aparelho.Id,
                    nomeAparelho = aparelho.Nome_Aparelho,
                    ultimaMedicao = _context.Medicoes
                        .AsNoTracking()
                        .Where(m => m.Aparelho_Id == aparelho.Id)
                        .OrderByDescending(m => m.Data_Hora)
                        .ThenByDescending(m => m.Id)
                        .Select(m => new
                        {
                            m.Tensao,
                            m.Corrente,
                            m.Potencia,
                            m.Frequencia,
                            fatorPotencia = m.Fator_Potencia,
                            dataHora = m.Data_Hora
                        })
                        .FirstOrDefault()
                })
                .ToListAsync();

            var resultado = aparelhos.Select(aparelho => new
            {
                aparelho.aparelhoId,
                aparelho.nomeAparelho,
                possuiMedicao = aparelho.ultimaMedicao != null,
                tensao = aparelho.ultimaMedicao != null
                    ? (decimal?)aparelho.ultimaMedicao.Tensao
                    : null,
                corrente = aparelho.ultimaMedicao != null
                    ? (decimal?)aparelho.ultimaMedicao.Corrente
                    : null,
                potencia = aparelho.ultimaMedicao != null
                    ? (decimal?)aparelho.ultimaMedicao.Potencia
                    : null,
                frequencia = aparelho.ultimaMedicao != null
                    ? (decimal?)aparelho.ultimaMedicao.Frequencia
                    : null,
                fatorPotencia = aparelho.ultimaMedicao != null
                    ? (decimal?)aparelho.ultimaMedicao.fatorPotencia
                    : null,
                dataHora = aparelho.ultimaMedicao != null
                    ? (DateTime?)aparelho.ultimaMedicao.dataHora
                    : null
            }).ToList();

            return Ok(resultado);
        }

        // Mantém a consulta da última medição geral para não quebrar usos existentes.
        [HttpGet("ultima")]
        public async Task<IActionResult> ObterUltima()
        {
            var medicao = await _context.Medicoes
                .AsNoTracking()
                .Include(m => m.Aparelho)
                .OrderByDescending(m => m.Data_Hora)
                .Select(m => new
                {
                    aparelhoId = m.Aparelho_Id,
                    nomeAparelho = m.Aparelho != null ? m.Aparelho.Nome_Aparelho : null,
                    tensao = m.Tensao,
                    corrente = m.Corrente,
                    potencia = m.Potencia,
                    frequencia = m.Frequencia,
                    fatorPotencia = m.Fator_Potencia,
                    dataHora = m.Data_Hora
                })
                .FirstOrDefaultAsync();

            if (medicao == null)
            {
                return NoContent();
            }

            return Ok(medicao);
        }
    }
}
