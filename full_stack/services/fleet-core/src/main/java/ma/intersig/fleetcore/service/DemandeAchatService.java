package ma.intersig.fleetcore.service;

import ma.intersig.fleetcore.dto.request.CreateDemandeAchatRequest;
import ma.intersig.fleetcore.dto.response.DemandeAchatDto;
import ma.intersig.fleetcore.dto.response.PageResponse;
import ma.intersig.fleetcore.entity.Composant;
import ma.intersig.fleetcore.entity.DemandeAchat;
import ma.intersig.fleetcore.entity.Fournisseur;
import ma.intersig.fleetcore.entity.User;
import ma.intersig.fleetcore.exception.InvalidTransitionException;
import ma.intersig.fleetcore.exception.ResourceNotFoundException;
import ma.intersig.fleetcore.repository.ComposantRepository;
import ma.intersig.fleetcore.repository.DemandeAchatRepository;
import ma.intersig.fleetcore.repository.FournisseurRepository;
import ma.intersig.fleetcore.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Service
@Transactional
public class DemandeAchatService {

    private final DemandeAchatRepository demandeAchatRepository;
    private final UserRepository userRepository;
    private final ComposantRepository composantRepository;
    private final FournisseurRepository fournisseurRepository;
    private final DemandeAchatCodeGenerator codeGenerator;

    public DemandeAchatService(DemandeAchatRepository demandeAchatRepository,
                                UserRepository userRepository,
                                ComposantRepository composantRepository,
                                FournisseurRepository fournisseurRepository,
                                DemandeAchatCodeGenerator codeGenerator) {
        this.demandeAchatRepository = demandeAchatRepository;
        this.userRepository = userRepository;
        this.composantRepository = composantRepository;
        this.fournisseurRepository = fournisseurRepository;
        this.codeGenerator = codeGenerator;
    }

    public DemandeAchatDto create(CreateDemandeAchatRequest req, Long demandeurId) {
        if ((req.composantId() == null && req.pieceLibre() == null)
                || (req.composantId() != null && req.pieceLibre() != null)) {
            throw new ma.intersig.fleetcore.exception.BusinessException(
                    "Either composantId or pieceLibre must be provided, but not both",
                    "COMPOSANT_OU_PIECE_LIBRE_REQUIS", 422);
        }

        User demandeur = userRepository.findById(demandeurId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found", "USER_NOT_FOUND"));

        OffsetDateTime now = OffsetDateTime.now();
        DemandeAchat da = new DemandeAchat();
        da.setCode(codeGenerator.generateCode(now.getYear()));
        da.setDateDemande(now);
        da.setDemandeur(demandeur);

        if (req.composantId() != null) {
            Composant composant = composantRepository.findById(req.composantId())
                    .orElseThrow(() -> new ResourceNotFoundException("Composant not found", "COMPOSANT_NOT_FOUND"));
            da.setComposant(composant);
        }

        da.setPieceLibre(req.pieceLibre());
        if (req.quantite() != null && req.quantite() <= 0) {
            throw new ma.intersig.fleetcore.exception.BusinessException(
                    "Quantity must be positive", "INVALID_QUANTITE", 422);
        }
        da.setQuantite(req.quantite() != null ? req.quantite() : 1);
        da.setMotif(req.motif());
        da.setUrgence(req.urgence());

        if (req.fournisseurId() != null) {
            Fournisseur fournisseur = fournisseurRepository.findById(req.fournisseurId())
                    .orElseThrow(() -> new ResourceNotFoundException("Fournisseur not found", "FOURNISSEUR_NOT_FOUND"));
            da.setFournisseur(fournisseur);
        }

        da.setStatut("Nouvelle");
        da = demandeAchatRepository.save(da);
        return DemandeAchatDto.from(da);
    }

    @Transactional(readOnly = true)
    public PageResponse<DemandeAchatDto> list(String statut, String urgence, String q, Pageable pageable) {
        Page<DemandeAchat> page = demandeAchatRepository.findByFilters(statut, urgence, q, pageable);
        return PageResponse.of(page.map(DemandeAchatDto::from));
    }

    @Transactional(readOnly = true)
    public DemandeAchatDto getById(Long id) {
        DemandeAchat da = demandeAchatRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("DemandeAchat not found", "DA_NOT_FOUND"));
        return DemandeAchatDto.from(da);
    }

    public DemandeAchatDto approuver(Long id, Long approbateurId) {
        DemandeAchat da = demandeAchatRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("DemandeAchat not found", "DA_NOT_FOUND"));
        if (!"Nouvelle".equals(da.getStatut())) {
            throw new InvalidTransitionException("Only 'Nouvelle' demands can be approved");
        }
        User approbateur = userRepository.findById(approbateurId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found", "USER_NOT_FOUND"));
        da.setStatut("Approuvée");
        da.setApprobateur(approbateur);
        da.setDateApprobation(OffsetDateTime.now());
        da = demandeAchatRepository.save(da);
        return DemandeAchatDto.from(da);
    }

    public DemandeAchatDto rejeter(Long id, String raison, Long approbateurId) {
        DemandeAchat da = demandeAchatRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("DemandeAchat not found", "DA_NOT_FOUND"));
        if (!"Nouvelle".equals(da.getStatut())) {
            throw new InvalidTransitionException("Only 'Nouvelle' demands can be rejected");
        }
        User approbateur = userRepository.findById(approbateurId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found", "USER_NOT_FOUND"));
        da.setStatut("Rejetée");
        da.setRaisonRejet(raison);
        da.setApprobateur(approbateur);
        da.setDateApprobation(OffsetDateTime.now());
        da = demandeAchatRepository.save(da);
        return DemandeAchatDto.from(da);
    }

    public DemandeAchatDto cloturer(Long id) {
        DemandeAchat da = demandeAchatRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("DemandeAchat not found", "DA_NOT_FOUND"));
        if (!"Approuvée".equals(da.getStatut())) {
            throw new InvalidTransitionException("Only 'Approuvée' demands can be closed");
        }
        da.setStatut("Clôturée");
        da = demandeAchatRepository.save(da);
        return DemandeAchatDto.from(da);
    }
}