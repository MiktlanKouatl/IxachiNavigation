
import { Boid } from '../../../../_legacy/src/ixachi/strategies/Boid';

export interface IAreaConstraint {
    constrain(boid: Boid): void;
}
