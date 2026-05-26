using Microsoft.EntityFrameworkCore;
using SmartEnergy.Domain.Entities;

namespace SmartEnergy.Infrastructure
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        public DbSet<Medicao> Medicoes { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Medicao>().ToTable("tb_medicoes");
        }
    }
}