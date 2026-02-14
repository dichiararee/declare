import PhoneNumber from 'awesome-phonenumber'

export const formatNum = (jid) => {
    let id = jid ? jid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '') : ''
    try {
        let pn = new PhoneNumber('+' + id)
        let formatted = pn.getNumber('international')

        if (formatted && formatted.startsWith('+1')) {
            formatted = formatted.replace(/^\+1 (\d{3})[- ]?(\d{3})[- ]?(\d{4})/, '+1 ($1) $2-$3')
        }
        return formatted || '+' + id
    } catch {
        return '+' + id
    }
}