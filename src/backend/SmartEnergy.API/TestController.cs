using Microsoft.AspNetCore.Mvc;

namespace SmartEnergy.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TestController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new
        {
            message = "API SmartEnergy funcionando",
            timestamp = DateTime.UtcNow
        });
    }
}