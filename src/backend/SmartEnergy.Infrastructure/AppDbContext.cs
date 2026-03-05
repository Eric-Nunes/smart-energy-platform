using Microsoft.EntityFrameworkCore;

namespace SmartEnergy.Infrastructure.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        //public DbSet<Device> Devices { get; set; }
        //public DbSet<EnergyReading> EnergyReadings { get; set; }
    }
}