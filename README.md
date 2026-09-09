# MacroScore Preview

Visualização isolada do módulo **RSI Histórico & Retornos Futuros**.

Este repositório público existe apenas para preview visual e testes de interface. O código proprietário e a metodologia completa do MacroScore permanecem no repositório privado original.

## Regras do preview

- RSI de Wilder, período 14.
- Thresholds: 30, 25 e 20.
- Horizontes futuros: 30, 90, 180 e 365 dias corridos.
- Nenhum preço ou resultado financeiro fictício é embutido.
- Resultados aparecem somente após carregar uma série real de `data, fechamento`.

## Executar

```bash
npm install
npm run build
npm run dev
```
