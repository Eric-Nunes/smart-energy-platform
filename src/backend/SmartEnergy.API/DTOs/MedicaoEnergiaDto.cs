namespace SmartEnergy.API.DTOs
{
    public class MedicaoEnergiaDto
    {
        public decimal Tensao { get; set; }

        public decimal Corrente { get; set; }

        public decimal PotenciaAtiva { get; set; }

        public decimal EnergiaAcumulada { get; set; }

        public decimal Frequencia { get; set; }

        public decimal FatorPotencia { get; set; }
    }
}