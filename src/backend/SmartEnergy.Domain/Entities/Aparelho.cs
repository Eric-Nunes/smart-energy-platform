using System;
using System.Collections.Generic;
using System.Text;

namespace SmartEnergy.Domain.Entities
{
    public class Aparelho
    {
        public int Id { get; set; }

        public string Nome_Aparelho { get; set; } = string.Empty;

        public string? Localizacao { get; set; }

        public int Usuario_Id { get; set; }

        public DateTime Data_Cadastro { get; set; }

        public Usuario? Usuario { get; set; }

        public ICollection<Medicao> Medicoes { get; set; } = new List<Medicao>();
    }
}
