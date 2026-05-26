namespace SmartEnergy.API.Services;

public class TariffLookupService
{
    private readonly HttpClient _httpClient;

    private static readonly Dictionary<string, TariffResponse> FallbackTariffs = new(StringComparer.OrdinalIgnoreCase)
    {
        ["SP"] = new("SP", "São Paulo", "Tarifa residencial estimada", 0.91m, "amarela"),
        ["RJ"] = new("RJ", "Rio de Janeiro", "Tarifa residencial estimada", 0.94m, "vermelha"),
        ["MG"] = new("MG", "Minas Gerais", "Tarifa residencial estimada", 0.83m, "verde"),
        ["PR"] = new("PR", "Paraná", "Tarifa residencial estimada", 0.79m, "verde"),
    };

    public TariffLookupService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<TariffResponse> GetTariffAsync(string state, CancellationToken cancellationToken = default)
    {
        var normalizedState = string.IsNullOrWhiteSpace(state) ? "SP" : state.Trim().ToUpperInvariant();

        // Estrutura preparada para futura leitura automática em fonte oficial.
        // Enquanto a integração real não é concluída, mantemos fallback consistente para o frontend.
        try
        {
            using var request = new HttpRequestMessage(
                HttpMethod.Get,
                "https://www.gov.br/aneel/pt-br/assuntos/tarifas/bandeiras-tarifarias");

            using var response = await _httpClient.SendAsync(request, cancellationToken);
            response.EnsureSuccessStatusCode();

            // A resposta oficial ainda não é transformada em tarifa estadual aqui.
            // Quando a fonte definitiva estiver fechada, basta substituir este retorno.
        }
        catch
        {
            // Mantém fallback local quando a fonte externa não está acessível.
        }

        if (FallbackTariffs.TryGetValue(normalizedState, out var tariff))
        {
            return tariff;
        }

        return new TariffResponse(normalizedState, normalizedState, "Tarifa residencial estimada", 0.88m, "amarela");
    }
}

public record TariffResponse(
    string State,
    string StateName,
    string Distributor,
    decimal PricePerKwh,
    string Flag);
