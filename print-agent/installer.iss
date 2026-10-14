#define AppName "GARA Print Agent"
#define SetupPassword GetEnv("GARA_SETUP_PASSWORD")
#if SetupPassword == ""
  #error Set GARA_SETUP_PASSWORD before compiling the installer.
#endif
#if !FileExists("dist\runtime\coreclr.dll")
  #error Build Inno Setup with build.ps1 -BundleRuntime; Lite uses Install.cmd with a runtime prerequisite check.
#endif
[Setup]
AppId={{5F5B8E32-603A-40BF-8A82-7C0A38CB526C}}
AppName={#AppName}
AppVersion=0.1.1
AppPublisher=KAZUKO VIET NAM
DefaultDirName={autopf}\GARA Print Agent
DefaultGroupName=GARA Print Agent
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0.19041
WizardStyle=modern
DisableProgramGroupPage=yes
OutputDir=installer-output
OutputBaseFilename=GaraPrintAgentSetup
Compression=lzma2
SolidCompression=yes
Password={#SetupPassword}
Encryption=yes
CloseApplications=no
RestartApplications=no
UninstallDisplayName=GARA Print Agent
UninstallDisplayIcon={app}\runtime\Garage.PrintService.exe
SetupLogging=yes
[Tasks]
Name: "desktopicon"; Description: "Tạo biểu tượng GARA Print Agent trên Desktop"; Flags: checkedonce
[Files]
Source: "dist\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "setup-service.ps1"; DestDir: "{app}"; Flags: ignoreversion
[Icons]
Name: "{group}\GARA Print Agent"; Filename: "http://127.0.0.1:3790"
Name: "{autodesktop}\GARA Print Agent"; Filename: "http://127.0.0.1:3790"; Tasks: desktopicon
[Run]
Filename: "http://127.0.0.1:3790"; Description: "Mở GARA Print Agent để ghép máy in với cửa hàng"; Flags: shellexec postinstall runasoriginaluser skipifsilent
[UninstallRun]
Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\setup-service.ps1"" -Mode Uninstall -InstallRoot ""{app}"""; Flags: runhidden waituntilterminated; RunOnceId: "RemoveAgentService"
; Keep ProgramData ledger/credential for recovery; revoke station in GARA before removal.
[Code]
function IsCheckOnly: Boolean;
var I: Integer;
begin
  Result := False;
  for I := 1 to ParamCount do
    if CompareText(ParamStr(I), '/CHECKONLY') = 0 then Result := True;
end;

function RunServiceStep(Mode, ScriptPath: String): Boolean;
var ExitCode: Integer; Args: String;
begin
  ExitCode := -1;
  Args := '-NoProfile -ExecutionPolicy Bypass -File "' + ScriptPath +
    '" -Mode ' + Mode + ' -InstallRoot "' + ExpandConstant('{app}') + '"';
  Result := Exec(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'),
    Args, '', SW_HIDE, ewWaitUntilTerminated, ExitCode);
  Result := Result and (ExitCode = 0);
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var Info: AnsiString;
begin
  Result := '';
  if IsCheckOnly then begin
    ExtractTemporaryFile('build-info.json');
    if not LoadStringFromFile(ExpandConstant('{tmp}\build-info.json'), Info) then
      RaiseException('Cannot validate bundled package');
    Log('GARA_CHECKONLY_OK: password accepted and encrypted payload extracted; no installation performed.');
    Result := 'GARA_CHECKONLY_OK - validation finished without installing.';
    Exit;
  end;
  ExtractTemporaryFile('setup-service.ps1');
  if not RunServiceStep('Prepare', ExpandConstant('{tmp}\setup-service.ps1')) then
    Result := 'Không thể chuẩn bị Agent. Nếu đang in, chờ hoàn tất rồi thử lại. Nếu vẫn lỗi, liên hệ hỗ trợ kiểm tra dịch vụ.';
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
    if not RunServiceStep('Install', ExpandConstant('{app}\setup-service.ps1')) then
      RaiseException('Cài dịch vụ Agent chưa thành công. Vui lòng liên hệ hỗ trợ và cung cấp nhật ký cài đặt.');
end;
