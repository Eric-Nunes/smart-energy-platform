using System;
using System.Collections.Generic;
using System.Text;

namespace SmartEnergy.Domain.Entities
{
    public class TarifaEnergia
    {
        public int Id { get; set; }
        public string Estado { get; set; } = string.Empty;
        public decimal Valor_Kwh { get; set; }
        public DateTime Data_Inicio { get; set; }
        public DateTime? Data_Fim { get; set; }
    }
}
