
namespace SmartEnergy.Domain.Entities
{
    public class MetaMensal
    {
        public int Id { get; set; }

        public DateTime Mes_Referencia { get; set; }

        public decimal Meta_Consumo_Kwh { get; set; }

        public decimal Meta_Custo_Reais { get; set; }

        public DateTime Data_Atualizacao { get; set; }
    }
}
