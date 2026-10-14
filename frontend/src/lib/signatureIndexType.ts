import type { SignatureComponent } from '../../../backend/src/functionalities/signature/component/models';
import type { SupportedLanguage } from '@/translations/models';
import { t } from '@/translations/utils';

/** Translation key describing how a component formats its element indices. */
export const indexTypeLabelKey = (type: SignatureComponent['index_type']) => {
    switch (type) {
        case 'dec': return 'indexTypeDecimal' as const;
        case 'roman': return 'indexTypeRoman' as const;
        case 'small_char': return 'indexTypeLowerLetter' as const;
        case 'capital_char': return 'indexTypeUpperLetter' as const;
        default: return null;
    }
};

/** Human readable name of a component's index format, e.g. "Decimal (1, 2, 3...)". */
export const indexTypeLabel = (type: SignatureComponent['index_type'], language: SupportedLanguage): string => {
    const key = indexTypeLabelKey(type);
    return key ? t(key, language) : type;
};
