package backend.fitmate.config;

import java.io.IOException;
import java.util.Arrays;
import java.util.stream.Collectors;

import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public class CalendarLinkingLoggingFilter extends OncePerRequestFilter {

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
			throws ServletException, IOException {
		String uri = request.getRequestURI();
		boolean isCalendarFlow = uri.startsWith("/api/calendar/auth/google")
				|| uri.startsWith("/oauth2/authorization/")
				|| uri.startsWith("/login/oauth2/code/")
				|| uri.startsWith("/connect/oauth2/code/");

		if (isCalendarFlow) {
			String method = request.getMethod();
			String query = request.getQueryString();
			String host = request.getHeader("Host");
			String xfh = request.getHeader("X-Forwarded-Host");
			String xfp = request.getHeader("X-Forwarded-Proto");
			String sessionId = (request.getSession(false) != null) ? request.getSession(false).getId() : "(no-session)";
			String cookies = (request.getCookies() != null)
					? Arrays.stream(request.getCookies()).map(c -> c.getName() + "=" + c.getValue())
							.collect(Collectors.joining("; "))
					: "(no-cookies)";

			System.out.println("[CAL-LINK][REQ] " + method + " " + uri + (query != null ? ("?" + query) : ""));
			System.out.println("[CAL-LINK][HDR] Host=" + host + ", XFH=" + xfh + ", XFP=" + xfp);
			System.out.println("[CAL-LINK][SES] sessionId=" + sessionId);
			System.out.println("[CAL-LINK][CK ] " + cookies);
		}

		filterChain.doFilter(request, response);
	}
} 