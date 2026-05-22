namespace SmartEnergy.API.DTOs
{
    public class MedicaoEnergiaDto
    {
        public int Dispositivo_Id { get; set; }

        public decimal Tensao { get; set; }

        public decimal Corrente { get; set; }

        public decimal Potencia { get; set; }

        public decimal Consumo_Kwh { get; set; }

        public DateTime Data_Hora { get; set; }
    }
}