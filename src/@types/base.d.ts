export interface BaseStats {
    address: string
    updated_at: string
    next_update_at: string
    quote_currency: string
    chain_id: number
    chain_name: string
    chain_tip_height: number
    chain_tip_signed_at: string
    current_page: number
    links: Links
    items: TxItem[]
}

export interface Links {
    prev: string
    next: any
}

export interface TxItem {
    block_signed_at: string
    block_height: number
    block_hash: string
    tx_hash: string
    tx_offset: number
    successful: boolean
    miner_address: string
    from_address: string
    from_address_label: any
    to_address: string
    to_address_label: any
    value: string
    value_quote: number
    pretty_value_quote: string
    gas_metadata: GasMetadata
    gas_offered: number
    gas_spent: number
    gas_price: number
    fees_paid: string
    gas_quote: number
    pretty_gas_quote: string
    gas_quote_rate: number
    explorers: Explorer[]
    log_events: LogEvent[]
}

export interface GasMetadata {
    contract_decimals: number
    contract_name: string
    contract_ticker_symbol: string
    contract_address: string
    supports_erc: any[]
    logo_url: string
}

export interface Explorer {
    label: string
    url: string
}

export interface LogEvent {
    block_signed_at: string
    block_height: number
    tx_offset: number
    log_offset: number
    tx_hash: string
    raw_log_topics: string[]
    sender_contract_decimals: number
    sender_name?: string
    sender_contract_ticker_symbol?: string
    sender_address: string
    sender_address_label: any
    sender_logo_url: string
    supports_erc: string[]
    sender_factory_address: any
    raw_log_data?: string
    decoded?: Decoded
}

export interface Decoded {
    name: string
    signature: string
    params: Param[]
}

export interface Param {
    name: string
    type: string
    indexed: boolean
    decoded: boolean
    value: string
}
