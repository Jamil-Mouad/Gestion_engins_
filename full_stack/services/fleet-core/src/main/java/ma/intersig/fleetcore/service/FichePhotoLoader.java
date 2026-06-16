package ma.intersig.fleetcore.service;

import com.lowagie.text.Image;
import org.apache.hc.client5.http.DnsResolver;
import org.apache.hc.client5.http.classic.methods.HttpGet;
import org.apache.hc.client5.http.config.ConnectionConfig;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder;
import org.apache.hc.core5.util.Timeout;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;

/**
 * Loads a fiche photo into an OpenPDF {@link Image}, shared by the pneu,
 * composant and vehicule fiches.
 *
 * <p>Resolution order: any URL pointing at our own {@code /api/v1/files/...}
 * endpoint is read straight from local storage (so an absolute URL to our own
 * host — which would otherwise resolve to loopback and be rejected by the SSRF
 * guard — still works); genuinely external http(s) URLs are fetched with the
 * SSRF-hardened client below; anything else is treated as a bare stored
 * filename.
 *
 * <p>Bytes are normalized through {@link ImageIO} and re-encoded to PNG so
 * formats OpenPDF cannot decode natively (notably WebP, via the TwelveMonkeys
 * plugin) still render. If ImageIO cannot read the bytes, the raw bytes are
 * handed to OpenPDF directly as a fallback.
 */
@Service
public class FichePhotoLoader {

    private static final Logger log = LoggerFactory.getLogger(FichePhotoLoader.class);
    private static final int MAX_PHOTO_BYTES = 5 * 1024 * 1024;
    private static final String FILES_MARKER = "/api/v1/files/";

    private final FileStorageService fileStorageService;

    public FichePhotoLoader(FileStorageService fileStorageService) {
        this.fileStorageService = fileStorageService;
    }

    /** Returns the photo as an OpenPDF Image, or {@code null} if it cannot be loaded. */
    public Image load(String photoUrl) {
        if (photoUrl == null || photoUrl.isBlank()) {
            return null;
        }
        try {
            byte[] bytes;
            if (photoUrl.contains(FILES_MARKER)) {
                bytes = loadLocal(photoUrl);
            } else if (photoUrl.startsWith("http://") || photoUrl.startsWith("https://")) {
                bytes = fetchRemote(photoUrl);
            } else {
                bytes = loadLocal(photoUrl);
            }
            return toImage(bytes);
        } catch (Exception e) {
            log.warn("fiche: could not load photo {}: {}", photoUrl, e.getMessage());
            return null;
        }
    }

    private byte[] loadLocal(String urlOrPath) throws IOException {
        String filename = urlOrPath.substring(urlOrPath.lastIndexOf('/') + 1);
        return fileStorageService.load(filename).getContentAsByteArray();
    }

    /** Normalize via ImageIO to PNG; fall back to the raw bytes if ImageIO can't read them. */
    private Image toImage(byte[] bytes) throws Exception {
        BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(bytes));
        if (decoded != null) {
            ByteArrayOutputStream png = new ByteArrayOutputStream();
            ImageIO.write(decoded, "png", png);
            return Image.getInstance(png.toByteArray());
        }
        return Image.getInstance(bytes);
    }

    /** SSRF-hardened fetch: the host must resolve only to public addresses, the
     * connection is pinned to those addresses (DNS-rebinding TOCTOU defense) and
     * redirects are not followed. TLS still validates the original hostname. */
    private byte[] fetchRemote(String url) throws Exception {
        URI uri = URI.create(url);
        String scheme = uri.getScheme();
        if (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme)) {
            throw new IllegalArgumentException("unsupported scheme: " + scheme);
        }
        String host = uri.getHost();
        if (host == null) {
            throw new IllegalArgumentException("missing host");
        }
        InetAddress[] resolved = InetAddress.getAllByName(host);
        for (InetAddress addr : resolved) {
            if (addr.isLoopbackAddress() || addr.isLinkLocalAddress()
                    || addr.isSiteLocalAddress() || addr.isAnyLocalAddress()
                    || addr.isMulticastAddress() || isUniqueLocalIpv6(addr)) {
                throw new IllegalArgumentException("photo host resolves to a non-public address");
            }
        }
        DnsResolver pinnedResolver = new DnsResolver() {
            @Override
            public InetAddress[] resolve(String h) throws UnknownHostException {
                if (!host.equalsIgnoreCase(h)) {
                    throw new UnknownHostException(h);
                }
                return resolved;
            }
            @Override
            public String resolveCanonicalHostname(String h) {
                return h;
            }
        };
        var connectionManager = PoolingHttpClientConnectionManagerBuilder.create()
                .setDnsResolver(pinnedResolver)
                .setDefaultConnectionConfig(ConnectionConfig.custom()
                        .setConnectTimeout(Timeout.ofSeconds(5))
                        .setSocketTimeout(Timeout.ofSeconds(8))
                        .build())
                .build();
        try (CloseableHttpClient client = HttpClients.custom()
                .setConnectionManager(connectionManager)
                .disableRedirectHandling()
                .disableAutomaticRetries()
                .disableCookieManagement()
                .build()) {
            HttpGet get = new HttpGet(uri);
            get.setConfig(RequestConfig.custom()
                    .setResponseTimeout(Timeout.ofSeconds(8))
                    .build());
            return client.execute(get, response -> {
                if (response.getCode() != 200) {
                    throw new IOException("HTTP " + response.getCode());
                }
                try (InputStream in = response.getEntity().getContent()) {
                    byte[] data = in.readNBytes(MAX_PHOTO_BYTES + 1);
                    if (data.length > MAX_PHOTO_BYTES) {
                        throw new IOException("photo exceeds " + MAX_PHOTO_BYTES + " bytes");
                    }
                    return data;
                }
            });
        }
    }

    /** fc00::/7 — IPv6 unique-local; isSiteLocalAddress only covers fec0::/10. */
    private boolean isUniqueLocalIpv6(InetAddress addr) {
        byte[] b = addr.getAddress();
        return b.length == 16 && (b[0] & 0xFE) == 0xFC;
    }
}
