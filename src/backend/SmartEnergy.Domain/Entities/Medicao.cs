using System;
using System.Collections.Generic;
using System.Text;

namespace SmartEnergy.Domain.Entities
{
    public class Medicao
    {
        public int Id { get; set; }

        public int Dispositivo_Id { get; set; }

        public decimal Tensao { get; set; }

        public decimal Corrente { get; set; }

        public decimal Potencia { get; set; }

        public decimal Consumo_Kwh { get; set; }

        public DateTime Data_Hora { get; set; }
    }
}
