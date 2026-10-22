-- Double-click launcher: starts the server, opens the browser, and stops the
-- server when the app is quit from the Dock. build_app.sh fills in __PROJECT__.

property projectDir : "__PROJECT__"
property appURL : "http://127.0.0.1:8000"
property serverPID : ""

on run
	if serverIsUp() then
		-- Already running (from an earlier launch or a terminal): just open it.
		open location appURL
		return
	end if

	set serverPID to do shell script "cd " & quoted form of projectDir & " && nohup venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000 > server.log 2>&1 & echo $!"

	repeat 30 times
		if serverIsUp() then
			open location appURL
			return
		end if
		delay 0.5
	end repeat

	display dialog "سرور اجرا نشد. جزئیات خطا در فایل server.log در پوشه‌ی پروژه است." buttons {"باشه"} default button 1 with icon stop
	stopServer()
	quit
end run

on quit
	stopServer()
	continue quit
end quit

on serverIsUp()
	try
		do shell script "curl -s -o /dev/null --max-time 1 " & appURL & "/auth/status"
		return true
	on error
		return false
	end try
end serverIsUp

on stopServer()
	if serverPID is not "" then
		try
			do shell script "kill " & serverPID
		end try
		set serverPID to ""
	end if
end stopServer
