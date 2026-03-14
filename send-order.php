<?php
/**
 * LE PATIO - Order Confirmation Email Handler
 * Sends order details to customer and admin after successful PayPal payment
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    // Get request data
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    // Validate required fields
    if (!$data) {
        throw new Exception('Invalid JSON data');
    }

    if (empty($data['cart']) || !is_array($data['cart'])) {
        throw new Exception('Cart is empty or invalid');
    }

    if (empty($data['email'])) {
        throw new Exception('Email is required');
    }

    // Validate and sanitize email
    $customerEmail = filter_var($data['email'], FILTER_VALIDATE_EMAIL);
    if (!$customerEmail) {
        throw new Exception('Invalid email address');
    }

    $adminEmail = 'coucoulepatio@gmail.com';
    $cart = $data['cart'];
    $shipping = floatval($data['shipping'] ?? 0);
    $paypalOrderId = sanitizeInput($data['paypalOrderId'] ?? '');

    // Calculate totals
    $subtotal = 0;
    foreach ($cart as $item) {
        $price = floatval($item['price'] ?? 0);
        $quantity = intval($item['quantity'] ?? 1);
        $subtotal += ($price * $quantity);
    }

    $total = $subtotal + $shipping;

    // Build email content
    $orderDetails = buildOrderDetails($cart, $subtotal, $shipping, $total);

    // Email to customer
    $customerSubject = 'LE PATIO - Order Confirmation';
    $customerBody = buildCustomerEmail($orderDetails, $total);
    $customerHeaders = buildEmailHeaders($adminEmail);

    // Email to admin
    $adminSubject = 'LE PATIO - New Order from ' . $customerEmail;
    $adminBody = buildAdminEmail($orderDetails, $customerEmail, $total, $paypalOrderId);
    $adminHeaders = buildEmailHeaders($adminEmail);

    // Send emails
    $customerEmailSent = mail($customerEmail, $customerSubject, $customerBody, $customerHeaders);
    $adminEmailSent = mail($adminEmail, $adminSubject, $adminBody, $adminHeaders);

    // Save order to file (backup)
    saveOrderData([
        'timestamp' => date('Y-m-d H:i:s'),
        'customer_email' => $customerEmail,
        'paypal_order_id' => $paypalOrderId,
        'cart' => $cart,
        'subtotal' => $subtotal,
        'shipping' => $shipping,
        'total' => $total,
        'emails_sent' => [
            'customer' => $customerEmailSent,
            'admin' => $adminEmailSent
        ]
    ]);

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Order confirmation sent successfully',
        'orderTotal' => number_format($total, 2)
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'error' => $e->getMessage()
    ]);
    exit;
}

/**
 * Build structured order details
 */
function buildOrderDetails($cart, $subtotal, $shipping, $total) {
    $items = [];
    foreach ($cart as $item) {
        $itemTotal = floatval($item['price']) * intval($item['quantity']);
        $items[] = [
            'name' => sanitizeInput($item['name'] ?? 'Unknown'),
            'size' => sanitizeInput($item['size'] ?? 'N/A'),
            'quantity' => intval($item['quantity'] ?? 1),
            'price' => floatval($item['price'] ?? 0),
            'total' => $itemTotal
        ];
    }

    return [
        'items' => $items,
        'subtotal' => $subtotal,
        'shipping' => $shipping,
        'total' => $total
    ];
}

/**
 * Build customer email content (HTML)
 */
function buildCustomerEmail($orderDetails, $total) {
    $itemsHtml = '';

    foreach ($orderDetails['items'] as $item) {
        $itemsHtml .= '
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">' . htmlspecialchars($item['name']) . '</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">' . htmlspecialchars($item['size']) . '</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">' . $item['quantity'] . '</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">€' . number_format($item['price'], 2, '.', '') . '</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">€' . number_format($item['total'], 2, '.', '') . '</td>
        </tr>';
    }

    return '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: "Times New Roman", Times, serif; color: #000; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; letter-spacing: 2px; }
            .order-details { margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background-color: #f1f1f1; padding: 12px; text-align: left; border-bottom: 2px solid #000; font-weight: bold; }
            .summary { margin-top: 20px; background-color: #f1f1f1; padding: 20px; }
            .summary-row { display: flex; justify-content: space-between; margin: 10px 0; font-size: 16px; }
            .summary-row.total { font-weight: bold; font-size: 18px; border-top: 1px solid #000; padding-top: 15px; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            .social { margin: 20px 0; text-align: center; }
            .social a { color: #000; text-decoration: none; margin: 0 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✧ LE PATIO ✧</h1>
                <p>Order Confirmation</p>
            </div>

            <div class="order-details">
                <p>Thank you for your purchase! Your order has been confirmed.</p>

                <table>
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Size</th>
                            <th>Quantity</th>
                            <th>Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ' . $itemsHtml . '
                    </tbody>
                </table>

                <div class="summary">
                    <div class="summary-row">
                        <span>Subtotal:</span>
                        <span>€' . number_format($orderDetails['subtotal'], 2, '.', '') . '</span>
                    </div>
                    <div class="summary-row">
                        <span>Shipping:</span>
                        <span>€' . number_format($orderDetails['shipping'], 2, '.', '') . '</span>
                    </div>
                    <div class="summary-row total">
                        <span>Total:</span>
                        <span>€' . number_format($orderDetails['total'], 2, '.', '') . '</span>
                    </div>
                </div>

                <p style="margin-top: 20px;">We will process your order and send you tracking information as soon as possible.</p>

                <div class="social">
                    <p>Follow us on <a href="https://www.instagram.com/lepatio" target="_blank">Instagram</a></p>
                </div>
            </div>

            <div class="footer">
                <p>LE PATIO - Fine Jewelry</p>
                <p><a href="mailto:coucoulepatio@gmail.com">coucoulepatio@gmail.com</a></p>
                <p style="margin-top: 15px; color: #999;">This is an automated email. Please do not reply directly.</p>
            </div>
        </div>
    </body>
    </html>';
}

/**
 * Build admin email content (Plain text + details)
 */
function buildAdminEmail($orderDetails, $customerEmail, $total, $paypalOrderId) {
    $itemsList = '';

    foreach ($orderDetails['items'] as $item) {
        $itemsList .= '- ' . htmlspecialchars($item['name']) . ' (Size: ' . htmlspecialchars($item['size']) . ') x' . $item['quantity'] . ' @ €' . number_format($item['price'], 2, '.', '') . ' = €' . number_format($item['total'], 2, '.', '') . "\n";
    }

    return '
=============================================================================
LE PATIO - NEW ORDER NOTIFICATION
=============================================================================

ORDER DETAILS:
--------------
Timestamp: ' . date('Y-m-d H:i:s') . '
Customer Email: ' . htmlspecialchars($customerEmail) . '
PayPal Order ID: ' . htmlspecialchars($paypalOrderId) . '

ITEMS ORDERED:
' . $itemsList . '

SUMMARY:
--------
Subtotal: €' . number_format($orderDetails['subtotal'], 2, '.', '') . '
Shipping: €' . number_format($orderDetails['shipping'], 2, '.', '') . '
TOTAL: €' . number_format($orderDetails['total'], 2, '.', '') . '

=============================================================================
ACTION REQUIRED:
1. Verify order details
2. Prepare items for shipment
3. Send tracking information to customer

Contact customer at: ' . htmlspecialchars($customerEmail) . '
=============================================================================
';
}

/**
 * Build email headers
 */
function buildEmailHeaders($from) {
    $headers = "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "From: LE PATIO <" . $from . ">\r\n";
    $headers .= "Reply-To: " . $from . "\r\n";
    $headers .= "X-Mailer: LE PATIO Order System\r\n";
    return $headers;
}

/**
 * Sanitize input to prevent injection
 */
function sanitizeInput($input) {
    if (is_array($input)) {
        return array_map('sanitizeInput', $input);
    }
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

/**
 * Save order data to file as backup
 */
function saveOrderData($orderData) {
    try {
        $ordersDir = __DIR__ . '/orders';

        // Create directory if it doesn't exist
        if (!is_dir($ordersDir)) {
            mkdir($ordersDir, 0755, true);
        }

        // Create order file with timestamp
        $orderFile = $ordersDir . '/order_' . time() . '_' . uniqid() . '.json';
        $json = json_encode($orderData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

        // Write to file
        file_put_contents($orderFile, $json);

        // Also log to a text file for easy viewing
        $logFile = $ordersDir . '/orders_log.txt';
        $logEntry = "[" . date('Y-m-d H:i:s') . "] Order saved: " . basename($orderFile) . " | Customer: " . $orderData['customer_email'] . " | Total: €" . number_format($orderData['total'], 2) . "\n";
        file_put_contents($logFile, $logEntry, FILE_APPEND);

        return true;
    } catch (Exception $e) {
        error_log('Error saving order data: ' . $e->getMessage());
        return false;
    }
}
?>
