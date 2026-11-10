namespace SmartEnergy.API.DTOs
{
    public class IntervaloConsumoDto
    {
        public DateTime DataHora { get; set; }
        public decimal PotenciaMedia { get; set; }
        public decimal ConsumoKwh { get; set; }
    }
}
