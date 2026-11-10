using System;
using System.Collections.Generic;
using System.Text;

namespace SmartEnergy.Domain.Entities
{
    public class Medicao
    {
        public int Id { get; set; }

        public int Aparelho_Id { get; set; }

        public decimal Tensao { get; set; }

        public decimal Corrente { get; set; }

        public decimal Potencia { get; set; }

        public decimal Energia_Kwh { get; set; }

        public decimal Frequencia { get; set; }

        public decimal Fator_Potencia { get; set; }

        public DateTime Data_Hora { get; set; }

        public Aparelho? Aparelho { get; set; }
    }
}