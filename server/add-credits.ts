import { Request, Response } from "express";
import { storage } from "./storage";
import { log } from "./vite";

/**
 * Fügt Credits zu einem Benutzer über dessen ID hinzu
 */
export async function addCreditsToUser(req: Request, res: Response) {
  try {
    const { userId, amount } = req.body;
    
    // Validiere die Parameter
    if (!userId || !amount || isNaN(parseInt(amount))) {
      return res.status(400).json({ 
        success: false, 
        message: "Ungültige Parameter. Bitte geben Sie eine gültige Benutzer-ID und einen Betrag an." 
      });
    }
    
    // Konvertiere zu Zahlen
    const userIdNum = parseInt(userId);
    const amountNum = parseInt(amount);
    
    // Hole aktuellen Benutzer
    const user = await storage.getUser(userIdNum);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: `Benutzer mit ID ${userId} nicht gefunden.` 
      });
    }
    
    // Berechne neuen Guthaben-Stand
    const currentBalance = user.credits_balance || 0;
    const newBalance = currentBalance + amountNum;
    
    // Aktualisiere den Benutzer
    const updatedUser = await storage.updateUserCredits(userIdNum, newBalance);
    
    // Füge Transaktion hinzu
    await storage.addCreditsTransaction({
      user_id: userIdNum,
      amount: amountNum,
      transaction_type: "add",
      description: "Manuell hinzugefügt über Admin-API"
    });
    
    // Sende erfolgreiche Antwort
    return res.status(200).json({
      success: true,
      message: `Erfolgreich ${amountNum} Credits zum Benutzer hinzugefügt.`,
      user: {
        id: updatedUser?.id,
        username: updatedUser?.username,
        oldBalance: currentBalance,
        newBalance: updatedUser?.credits_balance
      }
    });
    
  } catch (error) {
    log(`Fehler beim Hinzufügen von Credits: ${error}`, "credits");
    return res.status(500).json({
      success: false,
      message: "Interner Serverfehler beim Hinzufügen von Credits."
    });
  }
}