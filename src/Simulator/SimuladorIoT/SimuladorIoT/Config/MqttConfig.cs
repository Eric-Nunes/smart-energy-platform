using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SimuladorIoT.Config
{
    public class MqttConfig
    {
        public string Broker { get; set; } = "";

        public int Porta { get; set; }

        public string Usuario { get; set; } = "";

        public string Senha { get; set; } = "";
    }
}
