// 鉴权系统
class AuthSystem {
    constructor() {
        this.adminPassword = 'admin2024';
        this.passwordValidity = 1; // 分钟 - 密码每分钟更新
        this.sessionValidity = 90; // 分钟 - 会话90分钟有效
        this.sessionKey = 'sjtu_auth_session';
    }

    // 生成基于时间的密码
    generateTimeBasedPassword(seed) {
        const now = new Date();
        const timeSlot = Math.floor(now.getTime() / (this.passwordValidity * 60 * 1000));
        
        // 使用简单的哈希算法生成密码
        const combined = seed + timeSlot.toString();
        let hash = 0;
        for (let i = 0; i < combined.length; i++) {
            const char = combined.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        
        // 转换为6位数字密码
        const password = Math.abs(hash).toString().slice(-6).padStart(6, '0');
        return password;
    }

    // 验证访问密码
    validateAccessPassword(inputPassword) {
        const validPassword = this.generateTimeBasedPassword(this.adminPassword);
        return inputPassword === validPassword;
    }

    // 设置会话
    setSession() {
        const now = new Date();
        const expiry = now.getTime() + (this.sessionValidity * 60 * 1000);
        
        const sessionData = {
            authenticated: true,
            expiry: expiry,
            timestamp: now.getTime()
        };
        
        localStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
    }

    // 检查会话有效性
    isSessionValid() {
        try {
            const sessionData = localStorage.getItem(this.sessionKey);
            if (!sessionData) return false;
            
            const session = JSON.parse(sessionData);
            const now = new Date().getTime();
            
            return session.authenticated && now < session.expiry;
        } catch (error) {
            return false;
        }
    }

    // 清除会话
    clearSession() {
        localStorage.removeItem(this.sessionKey);
    }

    // 获取剩余时间（分钟）
    getRemainingTime() {
        try {
            const sessionData = localStorage.getItem(this.sessionKey);
            if (!sessionData) return 0;
            
            const session = JSON.parse(sessionData);
            const now = new Date().getTime();
            const remaining = Math.max(0, Math.floor((session.expiry - now) / 60000));
            
            return remaining;
        } catch (error) {
            return 0;
        }
    }

    // 获取会话过期时间戳
    getSessionExpiry() {
        try {
            const sessionData = localStorage.getItem(this.sessionKey);
            if (!sessionData) return 0;
            
            const session = JSON.parse(sessionData);
            return session.expiry;
        } catch (error) {
            return 0;
        }
    }
}

// 创建全局实例
const authSystem = new AuthSystem();
