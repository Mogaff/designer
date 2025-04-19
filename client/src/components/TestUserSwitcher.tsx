import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { switchTestUser, getCurrentTestUserId } from '@/lib/queryClient';

const TestUserSwitcher = () => {
  const [currentUserId, setCurrentUserId] = useState(getCurrentTestUserId());

  const handleSwitchUser = (userId: number) => {
    const newUserId = switchTestUser(userId);
    setCurrentUserId(newUserId);
  };

  return (
    <Card className="fixed bottom-2 right-2 z-50 shadow-md max-w-xs">
      <CardHeader className="py-2">
        <CardTitle className="text-sm">Test User Switcher</CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <div className="text-xs mb-2">Current User: {currentUserId}</div>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant={currentUserId === 1 ? "default" : "outline"} 
            onClick={() => handleSwitchUser(1)}
          >
            User 1
          </Button>
          <Button 
            size="sm" 
            variant={currentUserId === 2 ? "default" : "outline"} 
            onClick={() => handleSwitchUser(2)}
          >
            User 2
          </Button>
          <Button 
            size="sm" 
            variant={currentUserId === 3 ? "default" : "outline"} 
            onClick={() => handleSwitchUser(3)}
          >
            User 3
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TestUserSwitcher;