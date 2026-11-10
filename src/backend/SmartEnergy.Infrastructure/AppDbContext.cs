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

        public DbSet<Usuario> Usuarios { get; set; }

        public DbSet<Aparelho> Aparelhos { get; set; }

        public DbSet<Medicao> Medicoes { get; set; }

        public DbSet<TarifaEnergia> TarifasEnergia { get; set; }

        public DbSet<MetaMensal> MetasMensais { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // USUÁRIOS
            modelBuilder.Entity<Usuario>(entity =>
            {
                entity.ToTable("tb_usuarios");

                entity.HasKey(u => u.Id);

                entity.Property(u => u.Nome)
                    .HasColumnName("nome")
                    .HasMaxLength(100)
                    .IsRequired();

                entity.Property(u => u.Email)
                    .HasColumnName("email")
                    .HasMaxLength(150)
                    .IsRequired();

                entity.Property(u => u.Senha)
                    .HasColumnName("senha")
                    .HasMaxLength(255)
                    .IsRequired();

                entity.Property(u => u.Data_Cadastro)
                    .HasColumnName("data_cadastro");
            });

            // APARELHOS
            modelBuilder.Entity<Aparelho>(entity =>
            {
                entity.ToTable("tb_aparelhos");

                entity.HasKey(a => a.Id);

                entity.Property(a => a.Nome_Aparelho)
                    .HasColumnName("nome_aparelho")
                    .HasMaxLength(100)
                    .IsRequired();

                entity.Property(a => a.Localizacao)
                    .HasColumnName("localizacao")
                    .HasMaxLength(100);

                entity.Property(a => a.Usuario_Id)
                    .HasColumnName("usuario_id");

                entity.Property(a => a.Data_Cadastro)
                    .HasColumnName("data_cadastro");

                entity.HasOne(a => a.Usuario)
                    .WithMany(u => u.Aparelhos)
                    .HasForeignKey(a => a.Usuario_Id)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // MEDIÇÕES
            modelBuilder.Entity<Medicao>(entity =>
            {
                entity.ToTable("tb_medicoes");

                entity.HasKey(m => m.Id);

                entity.Property(m => m.Aparelho_Id)
                    .HasColumnName("aparelho_id");

                entity.Property(m => m.Tensao)
                    .HasColumnName("tensao")
                    .HasPrecision(10, 2);

                entity.Property(m => m.Corrente)
                    .HasColumnName("corrente")
                    .HasPrecision(10, 3);

                entity.Property(m => m.Potencia)
                    .HasColumnName("potencia")
                    .HasPrecision(10, 2);

                entity.Property(m => m.Energia_Kwh)
                    .HasColumnName("energia_kwh")
                    .HasPrecision(10, 4);

                entity.Property(m => m.Frequencia)
                    .HasColumnName("frequencia")
                    .HasPrecision(10, 2);

                entity.Property(m => m.Fator_Potencia)
                    .HasColumnName("fator_potencia")
                    .HasPrecision(10, 2);

                entity.Property(m => m.Data_Hora)
                    .HasColumnName("data_hora");

                entity.HasOne(m => m.Aparelho)
                    .WithMany(a => a.Medicoes)
                    .HasForeignKey(m => m.Aparelho_Id)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            //TARIFAS ENERGIA
            modelBuilder.Entity<TarifaEnergia>(entity => 
            {
                entity.ToTable("tb_tarifas_energia");

                entity.HasKey(t => t.Id);

                entity.Property(t => t.Estado)
                .HasColumnName("estado")
                .HasMaxLength(2)
                .IsRequired();

                entity.Property(t => t.Valor_Kwh)
                .HasColumnName("valor_kwh")
                .HasPrecision(10, 4);

                entity.Property(t => t.Data_Inicio)
                .HasColumnName("data_inicio");

                entity.Property(t => t.Data_Fim)
                .HasColumnName("data_fim");
            });


            // METAS MENSAIS
            modelBuilder.Entity<MetaMensal>(entity =>
            {
                entity.ToTable("tb_metas_mensais");

                entity.HasKey(m => m.Id);

                entity.Property(m => m.Mes_Referencia)
                    .HasColumnName("mes_referencia")
                    .HasColumnType("date")
                    .IsRequired();

                entity.Property(m => m.Meta_Consumo_Kwh)
                    .HasColumnName("meta_consumo_kwh")
                    .HasPrecision(10, 4)
                    .IsRequired();

                entity.Property(m => m.Meta_Custo_Reais)
                    .HasColumnName("meta_custo_reais")
                    .HasPrecision(10, 2)
                    .IsRequired();

                entity.Property(m => m.Data_Atualizacao)
                    .HasColumnName("data_atualizacao")
                    .IsRequired();
            });

        }
    }
}