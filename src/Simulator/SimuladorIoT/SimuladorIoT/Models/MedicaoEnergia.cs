
// CLASSES DOS DADOS

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SimuladorIoT.Models
{
    public class MedicaoEnergia
    {
        public int Dispositivo_Id { get; set; }

        public double Tensao { get; set; }

        public double Corrente { get; set; }

        public double Potencia { get; set; }

        public double Consumo_Kwh { get; set; }

        public DateTime Data_Hora { get; set; }
    }
}
