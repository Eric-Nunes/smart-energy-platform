using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartEnergy.API.Services;
using SmartEnergy.Domain.Entities;
using SmartEnergy.Infrastructure;
using System.ComponentModel.DataAnnotations;

namespace SmartEnergy.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AparelhosController : ControllerBase
    {
        // O projeto possui apenas um usuário cadastrado neste momento.
        private const int UsuarioPadraoId = 1;

        private readonly AppDbContext _context;
        private readonly MonitoramentoAtual _monitoramento;

        public AparelhosController(
            AppDbContext context,
            MonitoramentoAtual monitoramento)
        {
            _context = context;
            _monitoramento = monitoramento;
        }

        // Lista somente os aparelhos pertencentes ao usuário padrão.
        [HttpGet]
        public async Task<IActionResult> Obter()
        {
            var aparelhos = await _context.Aparelhos
                .AsNoTracking()
                .Where(a => a.Usuario_Id == UsuarioPadraoId)
                .OrderBy(a => a.Nome_Aparelho)
                .ToListAsync();

            return Ok(aparelhos);
        }

        // Cadastra um novo aparelho para o usuário padrão.
        [HttpPost]
        public async Task<IActionResult> Cadastrar([FromBody] AparelhoRequest request)
        {
            var nome = request.NomeAparelho.Trim();
            var localizacao = string.IsNullOrWhiteSpace(request.Localizacao)
                ? null
                : request.Localizacao.Trim();

            var usuarioExiste = await _context.Usuarios
                .AnyAsync(u => u.Id == UsuarioPadraoId);

            if (!usuarioExiste)
            {
                return BadRequest("O usuário padrão (ID 1) não foi encontrado no banco de dados.");
            }

            var aparelho = new Aparelho
            {
                Nome_Aparelho = nome,
                Localizacao = localizacao,
                Usuario_Id = UsuarioPadraoId,
                Data_Cadastro = DateTime.Now
            };

            _context.Aparelhos.Add(aparelho);
            await _context.SaveChangesAsync();

            return CreatedAtAction(
                nameof(ObterPorId),
                new { id = aparelho.Id },
                aparelho);
        }

        // Consulta um aparelho específico pertencente ao usuário padrão.
        [HttpGet("{id:int}")]
        public async Task<IActionResult> ObterPorId(int id)
        {
            var aparelho = await _context.Aparelhos
                .AsNoTracking()
                .FirstOrDefaultAsync(a =>
                    a.Id == id && a.Usuario_Id == UsuarioPadraoId);

            if (aparelho == null)
            {
                return NotFound("Aparelho não encontrado.");
            }

            return Ok(aparelho);
        }

        // Atualiza nome e localização sem alterar o histórico de medições.
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Atualizar(
            int id,
            [FromBody] AparelhoRequest request)
        {
            var aparelho = await _context.Aparelhos
                .FirstOrDefaultAsync(a =>
                    a.Id == id && a.Usuario_Id == UsuarioPadraoId);

            if (aparelho == null)
            {
                return NotFound("Aparelho não encontrado.");
            }

            aparelho.Nome_Aparelho = request.NomeAparelho.Trim();
            aparelho.Localizacao = string.IsNullOrWhiteSpace(request.Localizacao)
                ? null
                : request.Localizacao.Trim();

            await _context.SaveChangesAsync();

            return Ok(aparelho);
        }

        // Impede a exclusão quando existem medições vinculadas ao aparelho.
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Excluir(int id)
        {
            var aparelho = await _context.Aparelhos
                .FirstOrDefaultAsync(a =>
                    a.Id == id && a.Usuario_Id == UsuarioPadraoId);

            if (aparelho == null)
            {
                return NotFound("Aparelho não encontrado.");
            }

            var possuiMedicoes = await _context.Medicoes
                .AnyAsync(m => m.Aparelho_Id == id);

            if (possuiMedicoes)
            {
                return Conflict(
                    "Este aparelho possui medições registradas e não pode ser excluído para preservar seu histórico de consumo.");
            }

            _context.Aparelhos.Remove(aparelho);
            await _context.SaveChangesAsync();

            // Se o aparelho excluído estava selecionado, limpa a seleção atual.
            if (_monitoramento.AparelhoIdAtual == id)
            {
                _monitoramento.AparelhoIdAtual = null;
            }

            return NoContent();
        }
    }

    public class AparelhoRequest
    {
        [Required(ErrorMessage = "O nome do aparelho é obrigatório.")]
        [StringLength(100, ErrorMessage = "O nome deve ter no máximo 100 caracteres.")]
        public string NomeAparelho { get; set; } = string.Empty;

        [StringLength(100, ErrorMessage = "A localização deve ter no máximo 100 caracteres.")]
        public string? Localizacao { get; set; }
    }
}
