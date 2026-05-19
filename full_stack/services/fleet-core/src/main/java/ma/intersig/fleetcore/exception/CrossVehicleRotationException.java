package ma.intersig.fleetcore.exception;

public class CrossVehicleRotationException extends BusinessException {

    public CrossVehicleRotationException(String message) {
        super(message, "ROTATION_CROSS_VEHICLE", 422);
    }
}