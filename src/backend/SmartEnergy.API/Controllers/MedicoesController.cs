using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartEnergy.Domain.Entities;
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
            var medicoes = await _context.Medicoes.ToListAsync();

            return Ok(medicoes);
        }

        [HttpPost]
        public async Task<IActionResult> Criar(Medicao medicao)
        {
            _context.Medicoes.Add(medicao);

            await _context.SaveChangesAsync();

            return Ok(medicao);
        }
    }
}