package ma.intersig.fleetcore.service;

import ma.intersig.fleetcore.repository.DemandeAchatRepository;
import org.springframework.dao.CannotSerializeTransactionException;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DemandeAchatCodeGenerator {

    private final DemandeAchatRepository demandeAchatRepository;

    public DemandeAchatCodeGenerator(DemandeAchatRepository demandeAchatRepository) {
        this.demandeAchatRepository = demandeAchatRepository;
    }

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.SERIALIZABLE)
    @Retryable(CannotSerializeTransactionException.class)
    public String generateCode(int year) {
        Integer nextSeq = demandeAchatRepository.nextCode(year);
        if (nextSeq == null) {
            throw new IllegalStateException("Failed to generate sequence number for year: " + year);
        }
        return String.format("DA-%d-%04d", year, nextSeq);
    }
}