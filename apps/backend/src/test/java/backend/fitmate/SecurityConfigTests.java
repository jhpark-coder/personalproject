package backend.fitmate;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.beans.factory.annotation.Autowired;

import io.github.bucket4j.distributed.proxy.ProxyManager;

@SpringBootTest
@AutoConfigureMockMvc
class SecurityConfigTests {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private RedisTemplate<String, Object> redisTemplate;

    @MockBean
    private StringRedisTemplate stringRedisTemplate;

    @MockBean
    private OAuth2AuthorizedClientService authorizedClientService;

    @MockBean
    private ClientRegistrationRepository clientRegistrationRepository;

    @MockBean
    private ProxyManager<String> proxyManager;

    @Test
    void exerciseSeedReloadRejectsNonAdminUser() throws Exception {
        mockMvc.perform(post("/api/exercise-information/reload-seed")
                .with(csrf())
                .with(user("1").roles("USER")))
                .andExpect(status().isForbidden());
    }

    @Test
    void exerciseInstructionSaveRejectsNonAdminUser() throws Exception {
        mockMvc.perform(post("/api/exercises/instructions")
                .with(csrf())
                .contentType("application/json")
                .content("{\"exerciseId\":\"squat\",\"nameKo\":\"스쿼트\",\"instructionsKo\":[\"test\"]}")
                .with(user("1").roles("USER")))
                .andExpect(status().isForbidden());
    }

    @Test
    void exerciseSearchAllowsAnonymousRead() throws Exception {
        mockMvc.perform(get("/api/exercise-information"))
                .andExpect(status().isOk());
    }

    @Test
    void exerciseInstructionReadAllowsAnonymousRead() throws Exception {
        mockMvc.perform(get("/api/exercises/instructions/squat"))
                .andExpect(status().isOk());
    }

    @Test
    void protectedProfileRejectsAnonymousRead() throws Exception {
        mockMvc.perform(get("/api/auth/profile"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void dietSummaryRejectsAnonymousRead() throws Exception {
        mockMvc.perform(get("/api/diet/users/1/summary"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void dietSummaryRejectsDifferentUser() throws Exception {
        mockMvc.perform(get("/api/diet/users/1/summary")
                .with(user("2").roles("USER")))
                .andExpect(status().isForbidden());
    }

    @Test
    void dietFoodSearchRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/diet/foods"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void dietPhotoAnalysisRejectsAnonymousUser() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart("/api/diet/users/1/photo-analysis")
                .file("image", "fake".getBytes())
                .with(csrf()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void dietPhotoAnalysisRejectsDifferentUser() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart("/api/diet/users/1/photo-analysis")
                .file("image", "fake".getBytes())
                .with(csrf())
                .with(user("2").roles("USER")))
                .andExpect(status().isForbidden());
    }

    @Test
    void exerciseInstructionSaveAllowsAdminUser() throws Exception {
        mockMvc.perform(post("/api/exercises/instructions")
                .with(csrf())
                .contentType("application/json")
                .content("{\"exerciseId\":\"squat-admin\",\"nameKo\":\"스쿼트\",\"instructionsKo\":[\"test\"]}")
                .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk());
    }

    @Test
    void exerciseInstructionUpdateRejectsAnonymousUserBeforeHandlerResolution() throws Exception {
        mockMvc.perform(put("/api/exercises/instructions")
                .with(csrf())
                .contentType("application/json")
                .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void exerciseInstructionDeleteRejectsNonAdminUserBeforeHandlerResolution() throws Exception {
        mockMvc.perform(delete("/api/exercises/instructions/squat")
                .with(csrf())
                .with(user("1").roles("USER")))
                .andExpect(status().isForbidden());
    }
}
