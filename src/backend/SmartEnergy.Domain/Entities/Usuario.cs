using System;
using System.Collections.Generic;
using System.Text;

namespace SmartEnergy.Domain.Entities
{
    public class Usuario
    {
        public int Id { get; set; }

        public string Nome { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string Senha { get; set; } = string.Empty;

        public DateTime Data_Cadastro { get; set; }

        public ICollection<Aparelho> Aparelhos { get; set; } = new List<Aparelho>();
    }
}
