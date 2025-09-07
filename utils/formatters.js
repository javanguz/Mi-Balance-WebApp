// utils/formatters.js

/**
 * Formatea un número como moneda con opciones personalizables.
 * @param {number|string} amount - La cantidad a formatear.
 * @param {object} options - Opciones de formato.
 * @param {string} [options.signDisplay='always'] - Cómo mostrar el signo ('always', 'exceptZero', 'never').
 * @param {boolean} [options.includeSymbol=true] - Si se debe incluir el símbolo de la moneda.
 * @param {string} [options.style='decimal'] - Estilo de formato ('decimal', 'currency').
 * @param {string} [options.color] - Color del texto (ej. 'var(--ingresos-color)').
 * @param {string} [options.overrideSign] - Para forzar un signo específico ('+' o '-').
 * @returns {string} La cantidad formateada.
 */
function formatCurrency(amount, options = {}) {
    const {
        signDisplay = 'always',
        includeSymbol = true,
        style = 'decimal',
        color,
        overrideSign
    } = options;

    const number = Number(amount) || 0;
    const isNegative = number < 0;

    let sign = '';
    if (overrideSign) {
        sign = overrideSign;
    } else {
        if (signDisplay === 'always') {
            sign = number >= 0 ? '+' : '-';
        } else if (signDisplay === 'exceptZero' && number !== 0) {
            sign = number > 0 ? '+' : '-';
        }
    }

    const symbol = includeSymbol ? '$ ' : '';
    const absoluteAmount = Math.abs(number);

    let formattedNumber;
    if (style === 'currency') {
        formattedNumber = absoluteAmount.toLocaleString('es-AR', {
            style: 'currency',
            currency: 'ARS',
            signDisplay: 'never' // El símbolo se maneja manualmente
        }).replace('$', '').trim();
    } else {
        formattedNumber = absoluteAmount.toLocaleString('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    const result = `${sign}${sign ? ' ' : ''}${symbol}${formattedNumber}`;

    if (color) {
        return `<span style="color: ${color};">${result}</span>`;
    }

    return result;
}

module.exports = {
    // Formatos para Ingresos
    formatIncome: (amount) => formatCurrency(amount, { signDisplay: 'always' }),
    formatIncomeSimple: (amount) => formatCurrency(amount, { signDisplay: 'never' }),

    // Formatos para Egresos
    formatExpense: (amount) => formatCurrency(amount, { overrideSign: amount >= 0 ? '-' : '+' }),
    formatExpenseSimple: (amount) => formatCurrency(amount, { signDisplay: 'never' }),

    // Formato para Resultados (Balance)
    formatResult: (amount) => formatCurrency(amount, { signDisplay: 'always', includeSymbol: false }).replace(' ', ''),

    // Formato con signo y color dinámico
    formatMontoConSigno: (amount, tipo) => {
        const number = Number(amount) || 0;
        const isPositive = number >= 0;
        const color = tipo === 'ingreso' ? (isPositive ? 'var(--ingresos-color)' : 'var(--egresos-color)') : (isPositive ? 'var(--egresos-color)' : 'var(--ingresos-color)');
        const sign = tipo === 'egreso' ? (isPositive ? '-' : '+') : (isPositive ? '+' : '-');
        return formatCurrency(amount, { overrideSign: sign, color: color });
    },

    // Formatos específicos para reportes
    formatReportCurrency: (amount, tipo) => {
        const effectiveAmount = tipo === 'egreso' ? -Math.abs(Number(amount) || 0) : Math.abs(Number(amount) || 0);
        return formatCurrency(effectiveAmount, { style: 'currency', signDisplay: effectiveAmount < 0 ? 'always' : 'never', includeSymbol: true });
    },
    formatReportBalance: (amount) => {
        const number = Number(amount) || 0;
        return formatCurrency(number, { style: 'currency', signDisplay: number < 0 ? 'always' : 'never', includeSymbol: true });
    },
    formatReportCurrencySimple: (amount) => formatCurrency(amount, { signDisplay: 'never' }),

    // Formato para Resúmenes
    formatSummaryCurrency: (amount) => {
        const number = Number(amount) || 0;
        const sign = number < 0 ? '- ' : '';
        return `${sign}${formatCurrency(amount, { signDisplay: 'never' })}`;
    },
    formatReportBalancePlain: (amount) => {
        const number = Number(amount) || 0;
        return formatCurrency(number, { style: 'currency', signDisplay: number < 0 ? 'always' : 'never', includeSymbol: true });
    },
    
    // Función para obtener la fecha de hoy en formato YYYY-MM-DD
    getTodayForInput: () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
};
