using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartEnergy.API.Services;
using SmartEnergy.Infrastructure;

namespace SmartEnergy.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MonitoramentoController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly MonitoramentoAtual _monitoramento;

        public MonitoramentoController(
            AppDbContext context,
            MonitoramentoAtual monitoramento)
        {
            _context = context;
            _monitoramento = monitoramento;
        }

        [HttpGet("atual")]
        public async Task<IActionResult> ObterAparelhoSelecionado()
        {
            var aparelhoId = _monitoramento.AparelhoIdAtual;
            if (aparelhoId == null)
            {
                return NoContent();
            }

            var aparelho = await _context.Aparelhos
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == aparelhoId.Value);

            if (aparelho == null)
            {
                _monitoramento.AparelhoIdAtual = null;
                return NoContent();
            }

            return Ok(new
            {
                aparelhoId = aparelho.Id,
                nomeAparelho = aparelho.Nome_Aparelho
            });
        }

        [HttpPost("aparelho/{aparelhoId}")]
        public async Task<IActionResult> SelecionarAparelho(int aparelhoId)
        {
            var aparelho = await _context.Aparelhos
                .FirstOrDefaultAsync(a => a.Id == aparelhoId);

            if (aparelho == null)
            {
                return NotFound("Aparelho não encontrado.");
            }

            _monitoramento.AparelhoIdAtual = aparelhoId;

            return Ok(new
            {
                mensagem = "Aparelho selecionado para monitoramento.",
                aparelhoId = aparelhoId,
                nomeAparelho = aparelho.Nome_Aparelho
            });
        }
    }
}