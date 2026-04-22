export const EFFECT_TYPES = {
    FIRE_UP: 'fire_up',
    SPEED_UP: 'speed_up',
    SHIELD: 'shield'
};

export function SummonEffect(effectType, player, gridApi, assets) {
    console.log(`Executing ${effectType} for player ${player.id || 'local'}`);

    switch (effectType) {
        case EFFECT_TYPES.FIRE_UP:
            player.bombRadius += 1; // The simple +1 you mentioned!
            console.log("New radius:", player.bombRadius);
            break;
    }}