"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import Script from "next/script"

interface AddressAutocompleteProps extends React.InputHTMLAttributes<HTMLInputElement> {
    onAddressSelect?: (address: string) => void
}

declare global {
    interface Window {
        google: any
    }
}

export function AddressAutocomplete({
    onAddressSelect,
    value,
    onChange,
    ...props
}: AddressAutocompleteProps) {
    const [scriptLoaded, setScriptLoaded] = React.useState(false)
    const inputRef = React.useRef<HTMLInputElement>(null)
    const autocompleteRef = React.useRef<any>(null)

    React.useEffect(() => {
        if (scriptLoaded && inputRef.current && window.google) {
            autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
                types: ["address"],
                fields: ["formatted_address"],
            })

            autocompleteRef.current.addListener("place_changed", () => {
                if (!autocompleteRef.current) return

                const place = autocompleteRef.current.getPlace()
                if (!place) return // Safety check

                const address = place.formatted_address

                if (address && onAddressSelect) {
                    onAddressSelect(address)
                }

                // Trigger generic change event for parent state updates if needed
                // Assuming parent controls value via onChange, we might need to manually call it or depend on onAddressSelect
            })
        }
    }, [scriptLoaded, onAddressSelect])

    return (
        <>
            <Script
                src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
                strategy="lazyOnload"
                onLoad={() => setScriptLoaded(true)}
            />
            <Input
                {...props}
                ref={inputRef}
                value={value}
                onChange={onChange}
                placeholder={props.placeholder || "Comece a escrever a morada..."}
            />
        </>
    )
}
