package ma.intersig.magasin;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class MagasinApplication {

    public static void main(String[] args) {
        SpringApplication.run(MagasinApplication.class, args);
    }
}
