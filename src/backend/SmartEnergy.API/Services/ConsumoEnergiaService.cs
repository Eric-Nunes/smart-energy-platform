using SmartEnergy.Domain.Entities;
using SmartEnergy.API.DTOs;

namespace SmartEnergy.API.Services
{
    public class ConsumoEnergiaService
    {
        private const decimal IntervaloMaximoSegundos = 10m;

        public decimal CalcularConsumoKwh(IEnumerable<Medicao> medicoes)
        {
            var ordenadas = medicoes
                .OrderBy(m => m.Data_Hora)
                .ToList();

            decimal consumoKwh = 0m;

            for (int i = 1; i < ordenadas.Count; i++)
            {
                var anterior = ordenadas[i - 1];
                var atual = ordenadas[i];

                var intervaloSegundos =
                    (decimal)(atual.Data_Hora - anterior.Data_Hora).TotalSeconds;

                // Ignora intervalos inválidos ou muito longos.
                // Isso evita estimar consumo durante períodos sem medições.
                if (intervaloSegundos <= 0 ||
                    intervaloSegundos > IntervaloMaximoSegundos)
                {
                    continue;
                }

                // Regra do trapézio:
                // utiliza a potência média entre duas medições.
                var potenciaMedia =
                    (anterior.Potencia + atual.Potencia) / 2m;

                // W × segundos / 3.600.000 = kWh
                var energiaIntervalo =
                    (potenciaMedia * intervaloSegundos) / 3_600_000m;

                consumoKwh += energiaIntervalo;
            }

            return consumoKwh;
        }

        public List<IntervaloConsumoDto> CalcularIntervalos(
            IEnumerable<Medicao> medicoes)
        {
            var ordenadas = medicoes
                .OrderBy(m => m.Data_Hora)
                .ToList();

            var intervalos = new List<IntervaloConsumoDto>();

            for (int i = 1; i < ordenadas.Count; i++)
            {
                var anterior = ordenadas[i - 1];
                var atual = ordenadas[i];

                var intervaloSegundos =
                    (decimal)(atual.Data_Hora - anterior.Data_Hora).TotalSeconds;

                if (intervaloSegundos <= 0 ||
                    intervaloSegundos > IntervaloMaximoSegundos)
                {
                    continue;
                }

                var potenciaMedia =
                    (anterior.Potencia + atual.Potencia) / 2m;

                var energiaIntervalo =
                    (potenciaMedia * intervaloSegundos) / 3_600_000m;

                intervalos.Add(new IntervaloConsumoDto
                {
                    DataHora = atual.Data_Hora,
                    PotenciaMedia = potenciaMedia,
                    ConsumoKwh = energiaIntervalo
                });
            }

            return intervalos;
        }

    }
}