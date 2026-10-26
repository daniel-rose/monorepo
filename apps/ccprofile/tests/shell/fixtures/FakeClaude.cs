// Fake claude as a real Windows executable (`claude.exe`, copied to
// `codex.exe`), compiled by the shell test setup with Windows PowerShell's
// Add-Type. The process name tells which one ran. A copy of node.exe
// cannot stand in: node parses leading options itself (`-p`, unknown
// `--model=x` fails) and resolves its first argument to an absolute path.
// Same report as fake-claude.sh: stdout plus FAKE_CLAUDE_LOG, exit code from
// FAKE_CLAUDE_EXIT.
using System;
using System.IO;
using System.Text;

public static class FakeClaude
{
    private static string Read(string name)
    {
        return Environment.GetEnvironmentVariable(name) ?? "";
    }

    public static int Main(string[] args)
    {
        var report = new StringBuilder();
        report.Append("CCPROFILE=").Append(Read("CCPROFILE")).Append('\n');
        report.Append("CCPROFILE_ACCOUNT=").Append(Read("CCPROFILE_ACCOUNT")).Append('\n');
        report.Append("CLAUDE_CONFIG_DIR=").Append(Read("CLAUDE_CONFIG_DIR")).Append('\n');
        report.Append("CODEX_HOME=").Append(Read("CODEX_HOME")).Append('\n');
        report.Append("CCPROFILE_ARGV=").Append(Read("CCPROFILE_ARGV")).Append('\n');
        report.Append("TOOL=").Append(System.Diagnostics.Process.GetCurrentProcess().ProcessName).Append('\n');
        foreach (var arg in args)
        {
            report.Append("ARG<<").Append(arg).Append(">>\n");
        }

        var utf8 = new UTF8Encoding(false);
        var bytes = utf8.GetBytes(report.ToString());
        using (var stdout = Console.OpenStandardOutput())
        {
            stdout.Write(bytes, 0, bytes.Length);
        }
        var log = Read("FAKE_CLAUDE_LOG");
        if (log != "")
        {
            File.AppendAllText(log, report.ToString(), utf8);
        }

        // With FAKE_CLAUDE_HANDOFF, the first run writes it into the hook's
        // handoff file, as the mod does at /exit after /ccprofile-switch, and
        // keeps the file's path in FAKE_CLAUDE_LOG.handoff.
        var handoff = Read("CCPROFILE_HANDOFF");
        var marker = log + ".handoff";
        if (Read("FAKE_CLAUDE_HANDOFF") != "" && handoff != "" && !File.Exists(marker))
        {
            File.WriteAllText(handoff, Read("FAKE_CLAUDE_HANDOFF"), utf8);
            File.WriteAllText(marker, handoff, utf8);
        }

        int code;
        return int.TryParse(Read("FAKE_CLAUDE_EXIT"), out code) ? code : 0;
    }
}
