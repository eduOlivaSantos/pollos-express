# Pollos Express · Demo operativa

Prototipo de la sucursal piloto. Caja, cocina, inventario y gerencia comparten las órdenes registradas en el mismo navegador.

## Iniciar

Desde esta carpeta, ejecuta `npm start` con Node.js y abre [la demo local](http://127.0.0.1:4173). La demo usa un servidor de archivos sin dependencias. Usa una versión reciente de Edge, Chrome o Firefox.

## Guion

1. Selecciona **Sucursal piloto** y abre **Cocina** en otra pestaña con el enlace de caja.
2. Agrega dos **Combos Express** de Q45.00 y cobra Q90.00 con un pago simulado. Anota el número del ticket.
3. En cocina, verifica que aparece la misma orden. Inicia la preparación, márcala como lista y confirma la entrega.
4. En inventario, confirma que las piezas de pollo bajaron de 20 a 16 y busca la salida vinculada al ticket. En gerencia, verifica que la venta suma Q90.00 y un pedido. Cambia a **Sucursal Norte** para consultar sus ventas precargadas.
5. Vuelve a **Sucursal piloto** y usa **Simular desconexión**. Cobra otra orden. Comprueba que el ticket dice **Pendiente de sincronizar**. Restablece la conexión y verifica que la orden aparece una sola vez.
6. Usa **Reiniciar demo** para restaurar los datos de ejemplo en ambas sucursales.

Las ventas, el inventario, la conexión simulada y los tickets se guardan en el almacenamiento del navegador y se comparten entre pestañas del mismo origen y perfil. El prototipo usa datos ficticios, roles de demostración y pagos simulados. La contingencia se activa con el control de la demo.
