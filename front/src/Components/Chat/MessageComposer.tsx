import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/Components/ui/form'
import { Button } from '@/Components/ui/button'
import { Textarea } from '@/Components/ui/textarea'
import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const schema = z.object({
    content: z.string().min(1, 'Digite uma mensagem para enviar'),
})

type FormData = z.infer<typeof schema>

type MessageComposerProps = {
    placeholder: string
    onSubmit: (content: string) => boolean
    onTypingChange?: (isTyping: boolean) => void
}

export function MessageComposer({ placeholder, onSubmit, onTypingChange }: MessageComposerProps) {
    const typingTimeoutRef = useRef<number | null>(null)
    const form = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            content: '',
        },
    })

    const contentValue = form.watch('content')

    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                window.clearTimeout(typingTimeoutRef.current)
            }
        }
    }, [])

    function handleTyping(value: string) {
        if (!onTypingChange) {
            return
        }

        const hasContent = value.trim().length > 0
        onTypingChange(hasContent)

        if (typingTimeoutRef.current) {
            window.clearTimeout(typingTimeoutRef.current)
        }

        if (!hasContent) {
            return
        }

        typingTimeoutRef.current = window.setTimeout(() => {
            onTypingChange(false)
        }, 1200)
    }

    function submitMessage(data: FormData) {
        const trimmedContent = data.content.trim()

        if (!trimmedContent) {
            return
        }

        const didSubmit = onSubmit(trimmedContent)

        if (!didSubmit) {
            return
        }

        onTypingChange?.(false)
        form.resetField('content')
    }

    return (
        <Form {...form}>
            <form
                className="flex items-start gap-2 border-t bg-background p-4"
                onSubmit={form.handleSubmit(submitMessage)}
            >
                <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                        <FormItem className="flex flex-1 flex-col">
                            <FormControl>
                                <Textarea
                                    {...field}
                                    placeholder={placeholder}
                                    className="min-h-12"
                                    onChange={(event) => {
                                        field.onChange(event)
                                        handleTyping(event.target.value)
                                    }}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' && !event.shiftKey) {
                                            event.preventDefault()
                                            form.handleSubmit(submitMessage)()
                                        }
                                    }}
                                    title="Enter para enviar, Shift+Enter para quebrar linha"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" disabled={!contentValue.trim()}>
                    Enviar
                </Button>
            </form>
        </Form>
    )
}
